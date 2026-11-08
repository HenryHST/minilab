from __future__ import annotations

import base64
import hashlib
import secrets
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import state as app_state

router = APIRouter(tags=["auth"])

SESSION_COOKIE = "podcraft_session"
PENDING_COOKIE = "podcraft_oidc_pending"
SESSION_MAX_AGE = 60 * 60 * 12  # 12h
PENDING_MAX_AGE = 60 * 10  # 10m


def _serializer(purpose: str) -> URLSafeTimedSerializer:
    secret = (app_state.settings.session_secret or "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PODCRAFT_SESSION_SECRET is not configured",
        )
    return URLSafeTimedSerializer(secret, salt=f"podcraft-{purpose}")


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _pkce_pair() -> tuple[str, str]:
    verifier = _b64url(secrets.token_bytes(32))
    challenge = _b64url(hashlib.sha256(verifier.encode("ascii")).digest())
    return verifier, challenge


def dump_session(payload: dict[str, Any]) -> str:
    return _serializer("session").dumps(payload)


def load_session(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    try:
        data = _serializer("session").loads(token, max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired, HTTPException):
        return None
    if not isinstance(data, dict):
        return None
    return data


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/", secure=True, httponly=True, samesite="lax")


def set_session_cookie(response: Response, payload: dict[str, Any]) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        dump_session(payload),
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )


def _oidc_configured() -> bool:
    s = app_state.settings
    return bool(
        s.oidc_client_id
        and s.oidc_client_secret
        and s.oidc_authorization_url
        and s.oidc_token_url
        and s.oidc_redirect_uri
        and s.session_secret
    )


def _scopes() -> str:
    raw = (app_state.settings.oidc_scopes or "openid email profile").strip()
    return " ".join(raw.split())


def _normalize_groups(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        parts: list[str] = []
        for chunk in raw.replace("|", ",").replace(";", ",").split(","):
            for token in chunk.split():
                name = token.strip()
                if name and name not in parts:
                    parts.append(name)
        return parts
    if isinstance(raw, (list, tuple, set)):
        out: list[str] = []
        for item in raw:
            name = str(item).strip()
            if name and name not in out:
                out.append(name)
        return out
    return []


@router.get("/auth/start")
async def auth_start() -> RedirectResponse:
    mode = (app_state.settings.auth_mode or "oidc").lower()
    if mode not in ("oidc", "both"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OIDC disabled")
    if not _oidc_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OIDC is not fully configured",
        )

    state_token = secrets.token_urlsafe(24)
    verifier, challenge = _pkce_pair()
    pending = _serializer("pending").dumps(
        {"state": state_token, "code_verifier": verifier}
    )

    params = {
        "response_type": "code",
        "client_id": app_state.settings.oidc_client_id,
        "redirect_uri": app_state.settings.oidc_redirect_uri,
        "scope": _scopes(),
        "state": state_token,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    url = f"{app_state.settings.oidc_authorization_url}?{urlencode(params)}"
    redirect = RedirectResponse(url=url, status_code=302)
    redirect.set_cookie(
        PENDING_COOKIE,
        pending,
        max_age=PENDING_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    return redirect


@router.get("/auth/oidc/callback")
async def auth_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
) -> RedirectResponse:
    if error:
        detail = error_description or error
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"OIDC error: {detail}")
    if not code or not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing code/state")
    if not _oidc_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OIDC is not fully configured",
        )

    pending_raw = request.cookies.get(PENDING_COOKIE)
    try:
        pending = _serializer("pending").loads(pending_raw or "", max_age=PENDING_MAX_AGE)
    except (BadSignature, SignatureExpired, HTTPException):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OIDC pending state")
    if not isinstance(pending, dict) or pending.get("state") != state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OIDC state mismatch")
    code_verifier = pending.get("code_verifier")
    if not code_verifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing PKCE verifier")

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": app_state.settings.oidc_redirect_uri,
        "client_id": app_state.settings.oidc_client_id,
        "client_secret": app_state.settings.oidc_client_secret,
        "code_verifier": code_verifier,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        token_resp = await client.post(
            app_state.settings.oidc_token_url,
            data=data,
            headers={"Accept": "application/json"},
        )
        if token_resp.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Token exchange failed ({token_resp.status_code})",
            )
        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No access_token")

        userinfo: dict[str, Any] = {}
        userinfo_url = (app_state.settings.oidc_userinfo_url or "").strip()
        if userinfo_url:
            ui_resp = await client.get(
                userinfo_url,
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
            if ui_resp.status_code >= 400:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Userinfo failed ({ui_resp.status_code})",
                )
            userinfo = ui_resp.json()

    claim = (app_state.settings.oidc_group_claim or "groups").strip() or "groups"
    username = (
        str(userinfo.get("preferred_username") or userinfo.get("nickname") or userinfo.get("sub") or "")
        .strip()
    )
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No username in userinfo")

    session_payload = {
        "username": username,
        "groups": _normalize_groups(userinfo.get(claim)),
        "email": (str(userinfo.get("email")).strip() if userinfo.get("email") else None),
        "display_name": (
            str(userinfo.get("name")).strip() if userinfo.get("name") else None
        ),
    }

    redirect = RedirectResponse(url="/", status_code=302)
    set_session_cookie(redirect, session_payload)
    redirect.delete_cookie(PENDING_COOKIE, path="/", secure=True, httponly=True, samesite="lax")
    return redirect


@router.get("/auth/logout")
async def auth_logout() -> RedirectResponse:
    end_session = (app_state.settings.oidc_end_session_url or "").strip()
    if end_session:
        redirect_uri = (app_state.settings.oidc_redirect_uri or "").rstrip("/")
        post_logout = redirect_uri.rsplit("/auth/", 1)[0] + "/" if "/auth/" in redirect_uri else "/"
        params = {
            "client_id": app_state.settings.oidc_client_id,
            "post_logout_redirect_uri": post_logout,
        }
        target = f"{end_session}?{urlencode({k: v for k, v in params.items() if v})}"
        redirect = RedirectResponse(url=target, status_code=302)
    else:
        redirect = RedirectResponse(url="/login", status_code=302)
    clear_session_cookie(redirect)
    redirect.delete_cookie(PENDING_COOKIE, path="/", secure=True, httponly=True, samesite="lax")
    return redirect
