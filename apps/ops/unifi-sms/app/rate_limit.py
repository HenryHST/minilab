from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field


@dataclass
class RateLimiter:
    per_minute: int = 10
    daily_cap: int = 50
    _minute: deque[float] = field(default_factory=deque)
    _day_key: str = ""
    _day_count: int = 0

    def _roll(self, now: float) -> None:
        cutoff = now - 60.0
        while self._minute and self._minute[0] < cutoff:
            self._minute.popleft()
        day = time.strftime("%Y-%m-%d", time.localtime(now))
        if day != self._day_key:
            self._day_key = day
            self._day_count = 0

    def check(self, parts: int = 1) -> str | None:
        now = time.time()
        self._roll(now)
        if self.daily_cap > 0 and self._day_count + parts > self.daily_cap:
            return f"daily SMS cap reached ({self.daily_cap})"
        if self.per_minute > 0 and len(self._minute) + parts > self.per_minute:
            return f"rate limit exceeded ({self.per_minute}/min)"
        return None

    def commit(self, parts: int = 1) -> None:
        now = time.time()
        self._roll(now)
        for _ in range(parts):
            self._minute.append(now)
        self._day_count += parts

    @property
    def sent_today(self) -> int:
        self._roll(time.time())
        return self._day_count


limiter = RateLimiter()
