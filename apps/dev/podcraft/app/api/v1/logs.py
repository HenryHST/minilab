from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import Principal, require_user
from app.logs import ring

router = APIRouter()


class LogsOut(BaseModel):
    items: list[dict]


@router.get("/logs", response_model=LogsOut)
def get_logs(
    limit: int = Query(default=200, ge=1, le=500),
    _: Principal = Depends(require_user),
) -> LogsOut:
    return LogsOut(items=ring.snapshot(limit=limit))


@router.delete("/logs", status_code=204)
def clear_logs(_: Principal = Depends(require_user)) -> None:
    ring.clear()


@router.get("/logs/stream")
async def stream_logs(_: Principal = Depends(require_user)) -> StreamingResponse:
    async def event_gen():
        async for entry in ring.subscribe():
            payload = json.dumps(entry.to_dict())
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0)

    return StreamingResponse(event_gen(), media_type="text/event-stream")
