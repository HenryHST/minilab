from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import Principal, require_user
from app.config import state
from app import k8s

router = APIRouter()


class WorkloadOut(BaseModel):
    id: str
    namespace: str
    deployment: str
    desired: int
    ready: int
    available: int
    schedule: bool
    description: str
    dry_run: bool = False


def _out(status: k8s.WorkloadStatus) -> WorkloadOut:
    return WorkloadOut(
        id=status.id,
        namespace=status.namespace,
        deployment=status.deployment,
        desired=status.desired,
        ready=status.ready,
        available=status.available,
        schedule=status.schedule,
        description=status.description,
        dry_run=status.dry_run,
    )


@router.get("/workloads", response_model=list[WorkloadOut])
def list_workloads(_: Principal = Depends(require_user)) -> list[WorkloadOut]:
    out: list[WorkloadOut] = []
    for spec in state.workloads.values():
        try:
            out.append(_out(k8s.get_status(spec)))
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    return out


@router.get("/workloads/{workload_id}", response_model=WorkloadOut)
def get_workload(
    workload_id: str, _: Principal = Depends(require_user)
) -> WorkloadOut:
    spec = state.workloads.get(workload_id)
    if not spec:
        raise HTTPException(status_code=404, detail="workload not found")
    try:
        return _out(k8s.get_status(spec))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/workloads/{workload_id}/start", response_model=WorkloadOut)
def start_workload(
    workload_id: str, user: Principal = Depends(require_user)
) -> WorkloadOut:
    spec = state.workloads.get(workload_id)
    if not spec:
        raise HTTPException(status_code=404, detail="workload not found")
    try:
        return _out(k8s.start(spec, actor=user.username))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/workloads/{workload_id}/stop", response_model=WorkloadOut)
def stop_workload(
    workload_id: str, user: Principal = Depends(require_user)
) -> WorkloadOut:
    spec = state.workloads.get(workload_id)
    if not spec:
        raise HTTPException(status_code=404, detail="workload not found")
    try:
        return _out(k8s.stop(spec, actor=user.username))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc
