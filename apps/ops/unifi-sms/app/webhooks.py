from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import require_machine_token
from app.sms_service import send_sms

router = APIRouter(tags=["webhooks"])


class OtpIn(BaseModel):
    From: str | None = None
    To: str = Field(min_length=8)
    Body: str | None = None
    Message: str | None = None


class NotifyIn(BaseModel):
    to: str = Field(min_length=8)
    message: str = Field(min_length=1, max_length=480)


class OkOut(BaseModel):
    ok: bool
    parts: int


@router.post("/v1/otp", response_model=OkOut)
async def otp(body: OtpIn, _: str = Depends(require_machine_token)) -> OkOut:
    text = (body.Message or body.Body or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message or Body required")
    # Keep OTP short for 64-byte modem limit
    if len(text.encode("utf-8")) > 64 and body.Body and body.Body.strip():
        text = body.Body.strip()
    try:
        parts = await send_sms(to=body.To, message=text, source="otp")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:200]) from exc
    return OkOut(ok=True, parts=parts)


@router.post("/v1/notify", response_model=OkOut)
async def notify(body: NotifyIn, _: str = Depends(require_machine_token)) -> OkOut:
    try:
        parts = await send_sms(to=body.to, message=body.message, source="notify")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:200]) from exc
    return OkOut(ok=True, parts=parts)
