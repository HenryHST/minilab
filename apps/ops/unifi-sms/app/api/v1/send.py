from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import Principal, require_admin, require_machine_token
from app.sms_service import send_sms

router = APIRouter()


class SendIn(BaseModel):
    to: str = Field(min_length=8, max_length=20)
    message: str = Field(min_length=1, max_length=480)


class SendOut(BaseModel):
    ok: bool
    parts: int


@router.post("/send", response_model=SendOut)
async def api_send(
    body: SendIn,
    _: str = Depends(require_machine_token),
) -> SendOut:
    try:
        parts = await send_sms(to=body.to, message=body.message, source="api")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:200]) from exc
    return SendOut(ok=True, parts=parts)


@router.post("/ui/send", response_model=SendOut)
async def ui_send(
    body: SendIn,
    user: Principal = Depends(require_admin),
) -> SendOut:
    try:
        parts = await send_sms(
            to=body.to,
            message=body.message,
            source=f"ui:{user.username}",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:200]) from exc
    return SendOut(ok=True, parts=parts)
