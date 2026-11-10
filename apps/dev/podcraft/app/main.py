from __future__ import annotations

import asyncio
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.requests import Request

from app.api.v1 import api_router
from app.auth import Principal, require_podcraft_admin
from app.config import APP_VERSION, state
from app.lab_state import lab_state, resolve_build_info
from app.logs import ring
from app.middleware_fault import FaultInjectionMiddleware
from app.oidc import router as oidc_router
from app.schedule import scheduler_loop

_STATIC = Path(__file__).resolve().parent / "static"
_stop = asyncio.Event()
_task: asyncio.Task | None = None

REQUESTS = Counter(
    "podcraft_http_requests_total",
    "Total HTTP requests",
    ["method", "handler", "status"],
)
LATENCY = Histogram(
    "podcraft_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "handler"],
)


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
app.add_middleware(FaultInjectionMiddleware)
app.include_router(api_router)
app.include_router(oidc_router)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    handler = request.scope.get("route")
    path_template = getattr(handler, "path", request.url.path) if handler else request.url.path
    if path_template != "/metrics":
        REQUESTS.labels(request.method, path_template, str(response.status_code)).inc()
        LATENCY.labels(request.method, path_template).observe(time.perf_counter() - start)
    return response


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "version": APP_VERSION}


@app.get("/readyz")
def readyz() -> JSONResponse:
    if not lab_state.ready:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not ready"},
        )
    return JSONResponse({"status": "ready"})


@app.post("/readyz/enable")
def readyz_enable(_: Principal = Depends(require_podcraft_admin)) -> dict:
    lab_state.set_ready(True)
    return {"status": "ready", "enabled": True}


@app.post("/readyz/disable")
def readyz_disable(_: Principal = Depends(require_podcraft_admin)) -> dict:
    lab_state.set_ready(False)
    return {"status": "not ready", "enabled": False}


@app.get("/version")
def version() -> dict:
    return resolve_build_info()


@app.get("/metrics")
def metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/fault_injection/enable")
def fault_enable(_: Principal = Depends(require_podcraft_admin)) -> dict:
    lab_state.set_fault(True)
    return {"status": "enabled"}


@app.post("/fault_injection/disable")
def fault_disable(_: Principal = Depends(require_podcraft_admin)) -> dict:
    lab_state.set_fault(False)
    return {"status": "disabled"}


@app.get("/fault_injection/status")
def fault_status(_: Principal = Depends(require_podcraft_admin)) -> dict:
    return {"status": "enabled" if lab_state.fault_injection else "disabled"}


@app.get("/status/{code}")
def status_code(
    code: int,
    _: Principal = Depends(require_podcraft_admin),
) -> Response:
    if code < 100 or code > 599:
        raise HTTPException(status_code=400, detail="code must be 100-599")
    return PlainTextResponse(content=str(code), status_code=code)


@app.get("/delay/{seconds}")
async def delay_seconds(
    seconds: float,
    _: Principal = Depends(require_podcraft_admin),
) -> dict:
    if seconds < 0 or seconds > 30:
        raise HTTPException(status_code=400, detail="seconds must be 0-30")
    await asyncio.sleep(seconds)
    return {"delay": seconds, "status": "ok"}


if _STATIC.is_dir():
    app.mount("/static", StaticFiles(directory=str(_STATIC)), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(_STATIC / "index.html")


@app.get("/login")
def login_page() -> FileResponse:
    return FileResponse(_STATIC / "index.html")


@app.get("/settings")
@app.get("/schedule")
@app.get("/restore/vaultwarden")
@app.get("/logs")
@app.get("/podinfo")
@app.get("/docs")
def spa_routes() -> FileResponse:
    return FileResponse(_STATIC / "index.html")
