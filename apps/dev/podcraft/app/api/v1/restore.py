from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import Principal, require_restore
from app import restore as restore_svc

router = APIRouter(prefix="/restore")


class ArchiveOut(BaseModel):
    name: str
    size: int
    size_h: str
    mtime: datetime


class JobOut(BaseModel):
    name: str
    status: str
    succeeded: bool
    failed: bool
    active: bool
    archive: str
    by: str = ""
    started_at: datetime | None = None
    finished_at: datetime | None = None
    logs: str | None = None


class JobsListOut(BaseModel):
    active: list[JobOut]
    recent: list[JobOut]


class RestoreIn(BaseModel):
    archive: str = Field(..., min_length=1, max_length=128)
    confirm: str = Field(..., min_length=1, max_length=32)
    force: bool = False


class RestoreOut(BaseModel):
    job: str


def _job_out(info: restore_svc.JobInfo, *, include_logs: bool) -> JobOut:
    return JobOut(
        name=info.name,
        status=info.status,
        succeeded=info.succeeded,
        failed=info.failed,
        active=info.active,
        archive=info.archive,
        by=info.by,
        started_at=info.started_at,
        finished_at=info.finished_at,
        logs=info.logs if include_logs else None,
    )


@router.get("/archives", response_model=list[ArchiveOut])
def get_archives(_: Principal = Depends(require_restore)) -> list[ArchiveOut]:
    return [
        ArchiveOut(
            name=a.name, size=a.size, size_h=a.size_h, mtime=a.mtime
        )
        for a in restore_svc.list_archives()
    ]


@router.get("/jobs", response_model=JobsListOut)
def get_jobs(_: Principal = Depends(require_restore)) -> JobsListOut:
    active, recent = restore_svc.list_jobs()
    return JobsListOut(
        active=[_job_out(j, include_logs=False) for j in active],
        recent=[_job_out(j, include_logs=False) for j in recent],
    )


@router.get("/jobs/{name}", response_model=JobOut)
def get_job(name: str, _: Principal = Depends(require_restore)) -> JobOut:
    info = restore_svc.get_job(name, include_logs=True)
    if info is None:
        raise HTTPException(status_code=404, detail="job not found")
    return _job_out(info, include_logs=True)


@router.post("", response_model=RestoreOut, status_code=201)
def post_restore(
    body: RestoreIn, user: Principal = Depends(require_restore)
) -> RestoreOut:
    try:
        job = restore_svc.create_restore_job(
            archive=body.archive,
            confirm=body.confirm,
            force=body.force,
            actor=user.username,
        )
    except restore_svc.RestoreError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return RestoreOut(job=job)
