from __future__ import annotations

import secrets
from dataclasses import dataclass, field

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBasic, HTTPBasicCredentials, HTTPBearer

from app.config import state
from app.oidc import SESSION_COOKIE, load_session

_basic = HTTPBasic(auto_error=False)
_bearer = HTTPBearer(auto_error=False)

GROUP_ADMINS = "unifi_sms_admins"
GROUP_USERS = "unifi_sms_users"


@dataclass
class Principal:
    username: str
    auth_mode: str
    groups: list[str] = field(default_factory=list)
    email: str | None = None
    display_name: str | None = None

    def has_group(self, name: str) -> bool:
        return name in self.groups

    def is_admin(self) -> bool:
        return self.has_group(GROUP_ADMINS)

    def can_read(self) -> bool:
        return self.is_admin() or self.has_group(GROUP_USERS)

    def can_send(self) -> bool:
        return self.is_admin()


def _session_principal(request: Request) -> Principal | None:
    data = load_session(request.cookies.get(SESSION_COOKIE))
    if not data:
        return None
    username = str(data.get("username") or "").strip()
    if not username:
        return None
    groups = [str(g).strip() for g in (data.get("groups") or []) if str(g).strip()]
    return Principal(
        username=username,
        auth_mode="oidc",
        groups=groups,
        email=str(data["email"]).strip() if data.get("email") else None,
        display_name=str(data["display_name"]).strip() if data.get("display_name") else None,
    )


async def require_user(
    request: Request,
    credentials: HTTPBasicCredentials | None = Depends(_basic),
) -> Principal:
    if not state.settings.ui_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="UI disabled")

    mode = (state.settings.auth_mode or "oidc").lower()
    if mode == "none":
        return Principal(username="anonymous", auth_mode="none", groups=[GROUP_ADMINS])

    oidc = _session_principal(request) if mode in ("oidc", "both") else None
    if oidc is not None:
        return oidc

    if mode in ("basic", "both"):
        expected_user = state.settings.basic_user
        expected_pass = state.settings.basic_password
        if expected_pass and credentials is not None:
            user_ok = secrets.compare_digest(credentials.username, expected_user)
            pass_ok = secrets.compare_digest(credentials.password, expected_pass)
            if user_ok and pass_ok:
                return Principal(username=credentials.username, auth_mode="basic", groups=[GROUP_ADMINS])
        if mode == "basic" or (mode == "both" and oidc is None):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized",
                headers={"WWW-Authenticate": "Basic"} if mode == "basic" or credentials else None,
            )

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


async def require_reader(user: Principal = Depends(require_user)) -> Principal:
    if user.auth_mode == "basic":
        return user
    if not user.can_read():
        raise HTTPException(status_code=403, detail=f"Requires {GROUP_ADMINS} or {GROUP_USERS}")
    return user


async def require_admin(user: Principal = Depends(require_user)) -> Principal:
    if user.auth_mode == "basic":
        return user
    if not user.can_send():
        raise HTTPException(status_code=403, detail=f"Requires {GROUP_ADMINS}")
    return user


def _token_ok(provided: str | None) -> bool:
    if not provided:
        return False
    s = state.settings
    candidates = [t for t in (s.webhook_token, s.api_token) if t]
    return any(secrets.compare_digest(provided, t) for t in candidates)


async def require_machine_token(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    token = creds.credentials if creds else None
    if not _token_ok(token):
        raise HTTPException(status_code=401, detail="Invalid or missing bearer token")
    return token or ""
