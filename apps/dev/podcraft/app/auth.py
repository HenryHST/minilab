from __future__ import annotations

import secrets
from dataclasses import dataclass, field

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.config import state
from app.oidc import SESSION_COOKIE, load_session

_basic = HTTPBasic(auto_error=False)

GROUP_PODCRAFT_ADMINS = "podcraft_admins"
GROUP_VAULTWARDEN_ADMINS = "vaultwarden_admins"


@dataclass
class Principal:
    username: str
    auth_mode: str
    groups: list[str] = field(default_factory=list)
    email: str | None = None
    display_name: str | None = None

    def has_group(self, name: str) -> bool:
        return name in self.groups

    def is_podcraft_admin(self) -> bool:
        return self.has_group(GROUP_PODCRAFT_ADMINS)

    def can_restore(self) -> bool:
        return self.is_podcraft_admin() or self.has_group(GROUP_VAULTWARDEN_ADMINS)


def _session_principal(request: Request) -> Principal | None:
    raw = request.cookies.get(SESSION_COOKIE)
    data = load_session(raw)
    if not data:
        return None
    username = str(data.get("username") or "").strip()
    if not username:
        return None
    groups_raw = data.get("groups") or []
    groups = [str(g).strip() for g in groups_raw if str(g).strip()]
    email = data.get("email")
    display_name = data.get("display_name")
    return Principal(
        username=username,
        auth_mode="oidc",
        groups=groups,
        email=str(email).strip() if email else None,
        display_name=str(display_name).strip() if display_name else None,
    )


async def require_user(
    request: Request,
    credentials: HTTPBasicCredentials | None = Depends(_basic),
) -> Principal:
    mode = (state.settings.auth_mode or "oidc").lower()
    if mode == "none":
        # Local/dev only — never a cluster default.
        return Principal(
            username="anonymous",
            auth_mode="none",
            groups=[GROUP_PODCRAFT_ADMINS, GROUP_VAULTWARDEN_ADMINS],
        )

    oidc = _session_principal(request) if mode in ("oidc", "both") else None
    has_basic_attempt = credentials is not None
    if oidc is not None:
        return oidc

    if mode in ("basic", "both"):
        expected_user = state.settings.basic_user
        expected_pass = state.settings.basic_password
        if expected_pass and credentials is not None:
            user_ok = secrets.compare_digest(credentials.username, expected_user)
            pass_ok = secrets.compare_digest(credentials.password, expected_pass)
            if user_ok and pass_ok:
                # HA Basic has no Authentik groups and must not grant restore.
                return Principal(
                    username=credentials.username,
                    auth_mode="basic",
                    groups=[],
                )
        if mode == "basic" or (mode == "both" and oidc is None):
            if not expected_pass and mode == "basic":
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="BASIC auth configured without PODCRAFT_BASIC_PASSWORD",
                )
            challenge = mode == "basic" or has_basic_attempt
            headers = {"WWW-Authenticate": "Basic"} if challenge else None
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized",
                headers=headers,
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


async def require_podcraft_admin(
    user: Principal = Depends(require_user),
) -> Principal:
    if user.auth_mode == "basic":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires Authentik group podcraft_admins",
        )
    if not user.is_podcraft_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires Authentik group podcraft_admins",
        )
    return user


async def require_restore(
    user: Principal = Depends(require_user),
) -> Principal:
    if user.auth_mode == "basic":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Restore requires Authentik SSO (Basic HA has no restore access)",
        )
    if not user.can_restore():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires podcraft_admins or vaultwarden_admins",
        )
    return user


async def require_settings(
    user: Principal = Depends(require_user),
) -> Principal:
    """Profile/display settings: podcraft_admins or vaultwarden_admins; not Basic."""
    if user.auth_mode == "basic":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Settings require Authentik SSO",
        )
    if not (user.is_podcraft_admin() or user.has_group(GROUP_VAULTWARDEN_ADMINS)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires podcraft_admins or vaultwarden_admins",
        )
    return user


async def require_workload_access(
    user: Principal = Depends(require_user),
) -> Principal:
    """HA Basic or podcraft_admins (SSO)."""
    if user.auth_mode == "basic":
        return user
    if not user.is_podcraft_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires Authentik group podcraft_admins",
        )
    return user


def identity_extras(user: Principal) -> dict[str, str | None]:
    return {
        "email": user.email,
        "display_name": user.display_name,
    }
