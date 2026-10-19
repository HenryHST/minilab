from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import Principal, require_user
from app.config import APP_VERSION, state

router = APIRouter()


class MeOut(BaseModel):
    username: str
    auth_mode: str
    configured_auth_mode: str
    version: str


@router.get("/me", response_model=MeOut)
def me(user: Principal = Depends(require_user)) -> MeOut:
    return MeOut(
        username=user.username,
        auth_mode=user.auth_mode,
        configured_auth_mode=state.settings.auth_mode,
        version=APP_VERSION,
    )
