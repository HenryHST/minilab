from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.config import APP_VERSION, state
from app.logs import ring
from app.modem import modem
from app.oidc import router as oidc_router
from app.webhooks import router as webhook_router

_STATIC = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    modem.refresh_config()
    ring.emit(
        f"unifi-sms {APP_VERSION} starting ui={state.settings.ui_enabled} "
        f"auth={state.settings.auth_mode} modem={'yes' if modem.status.configured else 'no'}",
        "INFO",
    )
    yield
    await modem.close()


app = FastAPI(
    title="unifi-sms",
    version=APP_VERSION,
    description="UniFi U5G SMS bridge for Authentik",
    lifespan=lifespan,
)
app.include_router(webhook_router)
app.include_router(api_router)
app.include_router(oidc_router)


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "version": APP_VERSION}


@app.get("/readyz")
def readyz() -> JSONResponse:
    modem.refresh_config()
    if state.settings.dry_run or not modem.status.configured:
        return JSONResponse({"status": "ready", "mode": "dry-run"})
    return JSONResponse({"status": "ready", "connected": modem.status.connected})


if _STATIC.is_dir():
    app.mount("/static", StaticFiles(directory=str(_STATIC)), name="static")


def _spa() -> FileResponse:
    if not state.settings.ui_enabled:
        raise HTTPException(status_code=404, detail="UI disabled")
    return FileResponse(_STATIC / "index.html")


@app.get("/")
@app.get("/login")
@app.get("/logs")
def spa_routes() -> FileResponse:
    return _spa()
