from __future__ import annotations

import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

from app.config import state
from app import k8s
from app.logs import ring

# Last observed schedule window; None until first tick.
# Scale actions run only on window transitions so manual UI start/stop sticks in-between.
_last_want_on: bool | None = None


def _parse_hhmm(value: str) -> tuple[int, int]:
    hour, minute = value.split(":")
    return int(hour), int(minute)


def minutes_now(tz_name: str) -> int:
    now = datetime.now(ZoneInfo(tz_name))
    return now.hour * 60 + now.minute


def in_window(start: str, end: str, tz_name: str) -> bool:
    """True when current local time is within [start, end) same-day window."""
    sh, sm = _parse_hhmm(start)
    eh, em = _parse_hhmm(end)
    start_m = sh * 60 + sm
    end_m = eh * 60 + em
    now_m = minutes_now(tz_name)
    if start_m == end_m:
        return True
    if start_m < end_m:
        return start_m <= now_m < end_m
    # overnight window
    return now_m >= start_m or now_m < end_m


def schedule_active() -> bool:
    cfg = state.schedule
    if not cfg.enabled:
        return True
    return in_window(cfg.start, cfg.end, cfg.timezone)


async def apply_schedule(actor: str = "scheduler", *, force: bool = False) -> None:
    """Apply Day/Night scale on window transitions (or force=True for boot/reconcile)."""
    global _last_want_on
    want_on = schedule_active()
    # #region agent log
    try:
        import json
        import time
        from pathlib import Path

        Path("/tmp/podcraft-debug-e03b97.ndjson").open("a").write(
            json.dumps(
                {
                    "sessionId": "e03b97",
                    "runId": "post-fix",
                    "hypothesisId": "H1-H2",
                    "location": "schedule.py:apply_schedule",
                    "message": "scheduler tick",
                    "data": {
                        "want_on": want_on,
                        "last_want_on": _last_want_on,
                        "force": force,
                        "enabled": state.schedule.enabled,
                        "will_scale": force or _last_want_on is None or _last_want_on != want_on,
                    },
                    "timestamp": int(time.time() * 1000),
                }
            )
            + "\n"
        )
    except OSError:
        pass
    # #endregion
    if not force and _last_want_on is not None and _last_want_on == want_on:
        return
    _last_want_on = want_on
    for spec in state.workloads.values():
        if not spec.schedule:
            continue
        try:
            status = k8s.get_status(spec)
            action = None
            if want_on and status.desired == 0:
                action = "start"
                k8s.start(spec, actor=actor)
            elif not want_on and status.desired > 0:
                action = "stop"
                k8s.stop(spec, actor=actor)
            # #region agent log
            try:
                import json
                import time
                from pathlib import Path

                Path("/tmp/podcraft-debug-e03b97.ndjson").open("a").write(
                    json.dumps(
                        {
                            "sessionId": "e03b97",
                            "runId": "post-fix",
                            "hypothesisId": "H2",
                            "location": "schedule.py:workload",
                            "message": "scheduler workload decision",
                            "data": {
                                "id": spec.id,
                                "desired": status.desired,
                                "want_on": want_on,
                                "action": action,
                            },
                            "timestamp": int(time.time() * 1000),
                        }
                    )
                    + "\n"
                )
            except OSError:
                pass
            # #endregion
        except Exception as exc:  # noqa: BLE001 — keep loop alive
            ring.emit(f"scheduler {spec.id}: {exc}", "ERROR")


async def scheduler_loop(stop: asyncio.Event) -> None:
    ring.emit("scheduler started", "INFO")
    # Boot: align once to current window, then only on transitions.
    if state.schedule.enabled:
        await apply_schedule(force=True)
    while not stop.is_set():
        if state.schedule.enabled:
            await apply_schedule()
        try:
            await asyncio.wait_for(stop.wait(), timeout=60.0)
        except asyncio.TimeoutError:
            continue
    ring.emit("scheduler stopped", "INFO")
