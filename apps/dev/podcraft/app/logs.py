from __future__ import annotations

import asyncio
import time
from collections import deque
from dataclasses import dataclass
from typing import AsyncIterator


@dataclass
class LogEntry:
    ts: float
    level: str
    message: str

    def to_dict(self) -> dict:
        return {
            "ts": self.ts,
            "level": self.level,
            "message": self.message,
        }


class LogRing:
    def __init__(self, maxlen: int = 500) -> None:
        self._buf: deque[LogEntry] = deque(maxlen=maxlen)
        self._subs: list[asyncio.Queue[LogEntry | None]] = []
        self._lock = asyncio.Lock()

    def emit(self, message: str, level: str = "INFO") -> None:
        entry = LogEntry(ts=time.time(), level=level.upper(), message=message)
        self._buf.append(entry)
        for q in list(self._subs):
            try:
                q.put_nowait(entry)
            except asyncio.QueueFull:
                pass

    def snapshot(self, limit: int = 200) -> list[dict]:
        items = list(self._buf)[-limit:]
        return [e.to_dict() for e in items]

    def clear(self) -> None:
        self._buf.clear()
        self.emit("log buffer cleared", "INFO")

    async def subscribe(self) -> AsyncIterator[LogEntry]:
        q: asyncio.Queue[LogEntry | None] = asyncio.Queue(maxsize=100)
        self._subs.append(q)
        try:
            for e in self._buf:
                yield e
            while True:
                item = await q.get()
                if item is None:
                    break
                yield item
        finally:
            if q in self._subs:
                self._subs.remove(q)


ring = LogRing()
