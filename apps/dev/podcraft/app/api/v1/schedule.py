from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import Principal, require_user
from app.config import ScheduleConfig, state
from app.schedule import schedule_active

router = APIRouter()


class ScheduleOut(BaseModel):
    enabled: bool
    start: str
    end: str
    timezone: str
    active_now: bool


class ScheduleUpdate(BaseModel):
    enabled: bool | None = None
    start: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    end: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    timezone: str | None = None


def _out() -> ScheduleOut:
    cfg = state.schedule
    return ScheduleOut(
        enabled=cfg.enabled,
        start=cfg.start,
        end=cfg.end,
        timezone=cfg.timezone,
        active_now=schedule_active(),
    )


@router.get("/schedule", response_model=ScheduleOut)
def get_schedule(_: Principal = Depends(require_user)) -> ScheduleOut:
    return _out()


@router.put("/schedule", response_model=ScheduleOut)
def put_schedule(
    body: ScheduleUpdate, _: Principal = Depends(require_user)
) -> ScheduleOut:
    cfg = state.schedule
    state.schedule = ScheduleConfig(
        enabled=cfg.enabled if body.enabled is None else body.enabled,
        start=body.start or cfg.start,
        end=body.end or cfg.end,
        timezone=body.timezone or cfg.timezone,
    )
    return _out()
