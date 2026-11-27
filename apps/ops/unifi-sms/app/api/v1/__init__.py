from fastapi import APIRouter

from app.api.v1 import logs, me, send, status as status_api

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(me.router, tags=["me"])
api_router.include_router(logs.router, tags=["logs"])
api_router.include_router(status_api.router, tags=["status"])
api_router.include_router(send.router, tags=["send"])
