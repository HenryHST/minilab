from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import Principal, require_user
from app.config import APP_VERSION, state

router = APIRouter()


class MeOut(BaseModel):
    username: str
    auth_mode: str
    configured_auth_mode: str
    version: str
    groups: list[str] = Field(default_factory=list)
    email: str | None = None
    display_name: str | None = None
    permissions: dict[str, bool] = Field(default_factory=dict)


@router.get("/me", response_model=MeOut)
def me(user: Principal = Depends(require_user)) -> MeOut:
    return MeOut(
        username=user.username,
        auth_mode=user.auth_mode,
        configured_auth_mode=state.settings.auth_mode,
        version=APP_VERSION,
        groups=list(user.groups),
        email=user.email,
        display_name=user.display_name,
        permissions={
            "dashboard": user.can_read(),
            "logs": user.can_read(),
            "send": user.can_send(),
        },
    )
