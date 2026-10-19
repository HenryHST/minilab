from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import Principal, require_user
from app.config import state
from app import k8s
from app.logs import ring

router = APIRouter()


class HaBasicRotateOut(BaseModel):
    username: str
    password: str
    auth_mode: str
    secret: str


@router.post("/auth/ha-basic/rotate", response_model=HaBasicRotateOut)
def rotate_ha_basic(user: Principal = Depends(require_user)) -> HaBasicRotateOut:
    """Generate HA Basic credentials. OIDC admins only; plaintext returned once."""
    if user.auth_mode != "oidc":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HA basic rotate requires Authentik (OIDC) login",
        )
    mode = (state.settings.auth_mode or "").lower()
    if mode not in ("both", "basic"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Set PODCRAFT_AUTH_MODE=both (or basic) to enable HA Basic",
        )
    username = (state.settings.basic_user or "ha").strip() or "ha"
    password = secrets.token_urlsafe(24)
    try:
        secret_name = k8s.upsert_ha_basic_secret(username, password)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    state.set_basic_credentials(username, password)
    ring.emit(f"{user.username}: rotated HA basic credentials", "INFO")
    return HaBasicRotateOut(
        username=username,
        password=password,
        auth_mode=mode,
        secret=secret_name,
    )
