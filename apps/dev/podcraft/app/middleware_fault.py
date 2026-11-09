"""Return HTTP 500 for application routes when fault injection is enabled."""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.lab_state import FAULT_EXEMPT_PREFIXES, lab_state


def _exempt(path: str) -> bool:
    if path == "/":
        return False
    for prefix in FAULT_EXEMPT_PREFIXES:
        if path == prefix or path.startswith(prefix + "/") or path.startswith(prefix + "?"):
            return True
        # exact match for prefixes without trailing slash already covered
        if path.startswith(prefix) and (
            len(path) == len(prefix) or path[len(prefix)] in "/?"
        ):
            return True
    return False


class FaultInjectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if lab_state.fault_injection and not _exempt(request.url.path):
            return JSONResponse(
                status_code=500,
                content={"detail": "fault injection enabled"},
            )
        return await call_next(request)
