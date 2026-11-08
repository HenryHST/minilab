from __future__ import annotations

import secrets
from dataclasses import dataclass, field

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.config import state

_basic = HTTPBasic(auto_error=False)

GROUP_PODCRAFT_ADMINS = "podcraft_admins"
GROUP_VAULTWARDEN_ADMINS = "vaultwarden_admins"


@dataclass
class Principal:
    username: str
    auth_mode: str
    groups: list[str] = field(default_factory=list)

    def has_group(self, name: str) -> bool:
        return name in self.groups

    def is_podcraft_admin(self) -> bool:
        return self.has_group(GROUP_PODCRAFT_ADMINS)

    def can_restore(self) -> bool:
        return self.is_podcraft_admin() or self.has_group(GROUP_VAULTWARDEN_ADMINS)


def _oidc_user(request: Request) -> str | None:
    raw = request.headers.get("x-authentik-username")
    if raw is None:
        return None
    name = raw.strip()
    return name or None


def _oidc_groups(request: Request) -> list[str]:
    """Parse Authentik groups header (pipe/comma/space separated)."""
    raw = request.headers.get("x-authentik-groups") or ""
    if not raw.strip():
        return []
    parts: list[str] = []
    for chunk in raw.replace("|", ",").replace(";", ",").split(","):
        for token in chunk.split():
            name = token.strip()
            if name and name not in parts:
                parts.append(name)
    return parts


def _oidc_email(request: Request) -> str | None:
    raw = request.headers.get("x-authentik-email")
    if raw is None:
        return None
    email = raw.strip()
    return email or None


def _oidc_name(request: Request) -> str | None:
    raw = request.headers.get("x-authentik-name")
    if raw is None:
        return None
    name = raw.strip()
    return name or None


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

    oidc = _oidc_user(request)
    has_basic_attempt = credentials is not None
    if mode in ("oidc", "both") and oidc:
        return Principal(
            username=oidc,
            auth_mode="oidc",
            groups=_oidc_groups(request),
        )

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
        if mode == "basic" or (mode == "both" and not oidc):
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
        detail="Missing Authentik identity headers",
    )


async def require_podcraft_admin(
    user: Principal = Depends(require_user),
) -> Principal:
    if user.auth_mode == "basic":
        # Workloads still use require_user / require_workload_actor separately.
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


def identity_extras(request: Request) -> dict[str, str | None]:
    return {
        "email": _oidc_email(request),
        "display_name": _oidc_name(request),
    }
