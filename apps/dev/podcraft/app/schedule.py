from __future__ import annotations

import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

from app.config import state
from app import k8s
from app.logs import ring


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


async def apply_schedule(actor: str = "scheduler") -> None:
    want_on = schedule_active()
    for spec in state.workloads.values():
        if not spec.schedule:
            continue
        try:
            status = k8s.get_status(spec)
            if want_on and status.desired == 0:
                k8s.start(spec, actor=actor)
            elif not want_on and status.desired > 0:
                k8s.stop(spec, actor=actor)
        except Exception as exc:  # noqa: BLE001 — keep loop alive
            ring.emit(f"scheduler {spec.id}: {exc}", "ERROR")


async def scheduler_loop(stop: asyncio.Event) -> None:
    ring.emit("scheduler started", "INFO")
    while not stop.is_set():
        if state.schedule.enabled:
            await apply_schedule()
        try:
            await asyncio.wait_for(stop.wait(), timeout=60.0)
        except asyncio.TimeoutError:
            continue
    ring.emit("scheduler stopped", "INFO")
