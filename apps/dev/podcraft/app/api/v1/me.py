from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import Principal, identity_extras, require_user
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
    extras = identity_extras(user) if user.auth_mode == "oidc" else {}
    return MeOut(
        username=user.username,
        auth_mode=user.auth_mode,
        configured_auth_mode=state.settings.auth_mode,
        version=APP_VERSION,
        groups=list(user.groups),
        email=extras.get("email"),
        display_name=extras.get("display_name"),
        permissions={
            "dashboard": user.is_podcraft_admin(),
            "schedule": user.is_podcraft_admin(),
            "logs": user.is_podcraft_admin(),
            "ha": user.is_podcraft_admin() and user.auth_mode != "basic",
            "restore": user.can_restore() and user.auth_mode != "basic",
            "settings": (
                (user.is_podcraft_admin() or user.has_group("vaultwarden_admins"))
                and user.auth_mode != "basic"
            ),
        },
    )
