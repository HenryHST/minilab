from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import Principal, require_reader
from app.config import state
from app.modem import modem
from app.rate_limit import limiter

router = APIRouter()


class StatusOut(BaseModel):
    configured: bool
    connected: bool
    dry_run: bool
    host: str
    last_error: str | None
    sent_today: int
    daily_cap: int
    rate_per_minute: int
    allow_prefixes: str
    ui_enabled: bool


@router.get("/status", response_model=StatusOut)
def get_status(_: Principal = Depends(require_reader)) -> StatusOut:
    modem.refresh_config()
    s = state.settings
    return StatusOut(
        configured=modem.status.configured,
        connected=modem.status.connected,
        dry_run=s.dry_run or not modem.status.configured,
        host=modem.status.host,
        last_error=modem.status.last_error,
        sent_today=limiter.sent_today,
        daily_cap=s.sms_daily_cap,
        rate_per_minute=s.sms_rate_per_minute,
        allow_prefixes=s.sms_allow_prefixes,
        ui_enabled=s.ui_enabled,
    )
