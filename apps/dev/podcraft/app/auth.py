from __future__ import annotations

import secrets
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.config import state

_basic = HTTPBasic(auto_error=False)


@dataclass
class Principal:
    username: str
    auth_mode: str


def _oidc_user(request: Request) -> str | None:
    return request.headers.get("x-authentik-username")


async def require_user(
    request: Request,
    credentials: HTTPBasicCredentials | None = Depends(_basic),
) -> Principal:
    mode = (state.settings.auth_mode or "oidc").lower()
    if mode == "none":
        return Principal(username="anonymous", auth_mode="none")

    oidc = _oidc_user(request)
    if mode in ("oidc", "both") and oidc:
        return Principal(username=oidc, auth_mode="oidc")

    if mode in ("basic", "both"):
        expected_user = state.settings.basic_user
        expected_pass = state.settings.basic_password
        if expected_pass and credentials is not None:
            user_ok = secrets.compare_digest(credentials.username, expected_user)
            pass_ok = secrets.compare_digest(credentials.password, expected_pass)
            if user_ok and pass_ok:
                return Principal(username=credentials.username, auth_mode="basic")
        if mode == "basic" or (mode == "both" and not oidc):
            if not expected_pass and mode == "basic":
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="BASIC auth configured without PODCRAFT_BASIC_PASSWORD",
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized",
                headers={"WWW-Authenticate": "Basic"},
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing Authentik identity headers",
    )
