"""Admin lab controls for the Podinfo SPA page."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import Principal, require_podcraft_admin
from app.lab_state import lab_state

router = APIRouter(prefix="/lab")


class LabStatusOut(BaseModel):
    version: str
    commit: str
    commit_full: str = ""
    build_date: str
    ready: bool
    fault_injection: bool
    health: str = "ok"


class FlagOut(BaseModel):
    enabled: bool = Field(description="Current flag state")


@router.get("/status", response_model=LabStatusOut)
def lab_status(_: Principal = Depends(require_podcraft_admin)) -> LabStatusOut:
    return LabStatusOut(**lab_state.snapshot())


@router.post("/readyz/enable", response_model=FlagOut)
def lab_ready_enable(_: Principal = Depends(require_podcraft_admin)) -> FlagOut:
    lab_state.set_ready(True)
    return FlagOut(enabled=True)


@router.post("/readyz/disable", response_model=FlagOut)
def lab_ready_disable(_: Principal = Depends(require_podcraft_admin)) -> FlagOut:
    lab_state.set_ready(False)
    return FlagOut(enabled=False)


@router.post("/fault_injection/enable", response_model=FlagOut)
def lab_fault_enable(_: Principal = Depends(require_podcraft_admin)) -> FlagOut:
    lab_state.set_fault(True)
    return FlagOut(enabled=True)


@router.post("/fault_injection/disable", response_model=FlagOut)
def lab_fault_disable(_: Principal = Depends(require_podcraft_admin)) -> FlagOut:
    lab_state.set_fault(False)
    return FlagOut(enabled=False)
