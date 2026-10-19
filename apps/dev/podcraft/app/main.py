from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.config import APP_VERSION, state
from app.logs import ring
from app.schedule import scheduler_loop

_STATIC = Path(__file__).resolve().parent / "static"
_stop = asyncio.Event()
_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _task
    state.reload_workloads()
    state.sync_schedule_from_env()
    ring.emit(f"podcraft {APP_VERSION} starting (auth={state.settings.auth_mode})", "INFO")
    _stop.clear()
    _task = asyncio.create_task(scheduler_loop(_stop))
    yield
    _stop.set()
    if _task:
        await _task


app = FastAPI(
    title="podcraft",
    version=APP_VERSION,
    description="minilab k3s workload control plane",
    lifespan=lifespan,
)
app.include_router(api_router)


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "version": APP_VERSION}


if _STATIC.is_dir():
    app.mount("/static", StaticFiles(directory=str(_STATIC)), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(_STATIC / "index.html")


@app.get("/login")
def login_page() -> FileResponse:
    return FileResponse(_STATIC / "index.html")


@app.get("/settings")
def settings_page() -> FileResponse:
    return FileResponse(_STATIC / "index.html")
