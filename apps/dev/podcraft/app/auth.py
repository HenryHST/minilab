from __future__ import annotations

import json
import secrets
import time
from dataclasses import dataclass
from pathlib import Path

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.config import state

_basic = HTTPBasic(auto_error=False)
_DEBUG_LOG = Path("/tmp/podcraft-debug-e03b97.ndjson")


@dataclass
class Principal:
    username: str
    auth_mode: str


def _oidc_user(request: Request) -> str | None:
    return request.headers.get("x-authentik-username")


def _agent_log(hypothesis_id: str, message: str, data: dict) -> None:
    # #region agent log
    try:
        payload = {
            "sessionId": "e03b97",
            "runId": "auth-sso",
            "hypothesisId": hypothesis_id,
            "location": "auth.py:require_user",
            "message": message,
            "data": data,
            "timestamp": int(time.time() * 1000),
        }
        with _DEBUG_LOG.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(payload, separators=(",", ":")) + "\n")
    except OSError:
        pass
    # #endregion


async def require_user(
    request: Request,
    credentials: HTTPBasicCredentials | None = Depends(_basic),
) -> Principal:
    mode = (state.settings.auth_mode or "oidc").lower()
    if mode == "none":
        return Principal(username="anonymous", auth_mode="none")

    oidc = _oidc_user(request)
    path = request.url.path
    has_basic_attempt = credentials is not None
    if mode in ("oidc", "both") and oidc:
        _agent_log(
            "H1",
            "oidc ok",
            {"path": path, "mode": mode, "hasOidc": True, "hasBasicAttempt": has_basic_attempt},
        )
        return Principal(username=oidc, auth_mode="oidc")

    if mode in ("basic", "both"):
        expected_user = state.settings.basic_user
        expected_pass = state.settings.basic_password
        if expected_pass and credentials is not None:
            user_ok = secrets.compare_digest(credentials.username, expected_user)
            pass_ok = secrets.compare_digest(credentials.password, expected_pass)
            if user_ok and pass_ok:
                _agent_log(
                    "H1",
                    "basic ok",
                    {"path": path, "mode": mode, "hasOidc": False, "hasBasicAttempt": True},
                )
                return Principal(username=credentials.username, auth_mode="basic")
        if mode == "basic" or (mode == "both" and not oidc):
            if not expected_pass and mode == "basic":
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="BASIC auth configured without PODCRAFT_BASIC_PASSWORD",
                )
            # WWW-Authenticate: Basic makes browsers show a native password dialog (no SSO).
            challenge = mode == "basic" or has_basic_attempt
            _agent_log(
                "H1",
                "401 unauthorized",
                {
                    "path": path,
                    "mode": mode,
                    "hasOidc": bool(oidc),
                    "hasBasicAttempt": has_basic_attempt,
                    "sendWwwAuthenticateBasic": challenge,
                    "basicPasswordConfigured": bool(expected_pass),
                },
            )
            headers = {"WWW-Authenticate": "Basic"} if challenge else None
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized",
                headers=headers,
            )

    _agent_log(
        "H4",
        "missing authentik headers",
        {"path": path, "mode": mode, "hasOidc": False, "hasBasicAttempt": has_basic_attempt},
    )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing Authentik identity headers",
    )
