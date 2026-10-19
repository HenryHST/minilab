from fastapi import APIRouter

from app.api.v1 import logs, me, schedule, workloads

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(workloads.router, tags=["workloads"])
api_router.include_router(schedule.router, tags=["schedule"])
api_router.include_router(me.router, tags=["me"])
api_router.include_router(logs.router, tags=["logs"])
