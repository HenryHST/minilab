"""In-process lab / observability state (podinfo-style readiness + fault injection)."""

from __future__ import annotations

import os
import threading
from dataclasses import dataclass

from app.config import APP_VERSION


def resolve_build_info() -> dict[str, str]:
    commit = (
        os.environ.get("VCS_REF")
        or os.environ.get("PODCRAFT_VCS_REF")
        or os.environ.get("GITHUB_SHA")
        or "unknown"
    ).strip()
    if len(commit) > 12 and commit != "unknown":
        commit_short = commit[:7]
    else:
        commit_short = commit
    build_date = (
        os.environ.get("BUILD_DATE")
        or os.environ.get("PODCRAFT_BUILD_DATE")
        or "unknown"
    ).strip()
    return {
        "version": APP_VERSION,
        "commit": commit_short,
        "commit_full": commit,
        "build_date": build_date,
    }


@dataclass
class LabState:
    ready: bool = True
    fault_injection: bool = False
    _lock: threading.Lock = threading.Lock()

    def set_ready(self, enabled: bool) -> None:
        with self._lock:
            self.ready = enabled

    def set_fault(self, enabled: bool) -> None:
        with self._lock:
            self.fault_injection = enabled

    def snapshot(self) -> dict:
        info = resolve_build_info()
        with self._lock:
            return {
                **info,
                "ready": self.ready,
                "fault_injection": self.fault_injection,
                "health": "ok",
            }


lab_state = LabState()

# Paths that stay healthy while fault injection is enabled (podinfo-compatible).
FAULT_EXEMPT_PREFIXES = (
    "/healthz",
    "/readyz",
    "/metrics",
    "/fault_injection",
    "/api/v1/lab",
    "/static",
    "/docs",
    "/redoc",
    "/openapi.json",
)
