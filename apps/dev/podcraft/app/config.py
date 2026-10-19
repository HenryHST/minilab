from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkloadSpec(BaseModel):
    id: str
    namespace: str
    deployment: str
    target_replicas: int = 1
    schedule: bool = True
    description: str = ""
    icon: str = ""


class ScheduleConfig(BaseModel):
    enabled: bool = True
    start: str = "06:30"
    end: str = "23:45"
    timezone: str = "Europe/Berlin"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PODCRAFT_", extra="ignore")

    auth_mode: str = Field(default="oidc")  # oidc | basic | both | none
    basic_user: str = Field(default="ha")
    basic_password: str = Field(default="")
    ha_basic_secret: str = Field(default="podcraft-ha-basic")
    dry_run: bool = Field(default=False)
    workloads_file: str = Field(default="/config/workloads.json")
    log_level: str = Field(default="INFO")
    schedule_enabled: bool = Field(default=True)
    schedule_start: str = Field(default="06:30")
    schedule_end: str = Field(default="23:45")
    schedule_timezone: str = Field(default="Europe/Berlin")


@dataclass
class AppState:
    settings: Settings = field(default_factory=Settings)
    workloads: dict[str, WorkloadSpec] = field(default_factory=dict)
    schedule: ScheduleConfig = field(default_factory=ScheduleConfig)

    def set_basic_credentials(self, username: str, password: str) -> None:
        """Hot-update Basic credentials (env mounts do not refresh in-process)."""
        self.settings.basic_user = username
        self.settings.basic_password = password

    def reload_workloads(self) -> None:
        path = Path(self.settings.workloads_file)
        if not path.is_file():
            # Built-in defaults for local/dev without ConfigMap mount
            defaults = [
                WorkloadSpec(
                    id="drawio",
                    namespace="drawio",
                    deployment="drawio",
                    description="diagrams.net",
                    icon="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/diagramsnet.png",
                ),
                WorkloadSpec(
                    id="it-tools",
                    namespace="it-tools",
                    deployment="it-tools",
                    description="IT Tools",
                    icon="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/it-tools.png",
                ),
            ]
            self.workloads = {w.id: w for w in defaults}
            return
        raw: Any = json.loads(path.read_text(encoding="utf-8"))
        items = raw.get("workloads", raw) if isinstance(raw, dict) else raw
        specs = [WorkloadSpec.model_validate(item) for item in items]
        self.workloads = {w.id: w for w in specs}

    def sync_schedule_from_env(self) -> None:
        self.schedule = ScheduleConfig(
            enabled=self.settings.schedule_enabled,
            start=self.settings.schedule_start,
            end=self.settings.schedule_end,
            timezone=self.settings.schedule_timezone,
        )


def resolve_app_version() -> str:
    env = os.environ.get("APP_VERSION", "").strip()
    if env:
        return env
    for path in (
        Path("/app/VERSION"),
        Path(__file__).resolve().parent.parent / "VERSION",
    ):
        try:
            text = path.read_text(encoding="utf-8").strip()
            if text:
                return text
        except OSError:
            continue
    return "dev"


state = AppState()
state.reload_workloads()
state.sync_schedule_from_env()
APP_VERSION = resolve_app_version()
