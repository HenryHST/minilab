from __future__ import annotations

import re
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from kubernetes import client, config
from kubernetes.client.rest import ApiException

from app.config import state
from app.logs import ring

ARCHIVE_RE = re.compile(r"^vaultwarden-\d{8}-\d{6}\.tar\.gz$")
JOB_LABEL = "app=vaultwarden-ui-restore"
JOB_NAME_PREFIX = "vaultwarden-ui-restore-"

_create_lock = threading.Lock()


@dataclass
class ArchiveInfo:
    name: str
    size: int
    size_h: str
    mtime: datetime


@dataclass
class JobInfo:
    name: str
    succeeded: bool
    failed: bool
    active: bool
    archive: str
    by: str = ""
    status: str = "Unknown"
    started_at: datetime | None = None
    finished_at: datetime | None = None
    logs: str = ""


def backup_dir() -> Path:
    return Path(state.settings.backup_dir)


def restore_namespace() -> str:
    return state.settings.vw_restore_namespace


def vw_replicas() -> str:
    return state.settings.vw_replicas


def _human(n: int) -> str:
    size = float(n)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.0f} {unit}" if unit == "B" else f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


def _k8s() -> tuple[client.BatchV1Api, client.CoreV1Api]:
    try:
        config.load_incluster_config()
    except config.ConfigException:
        config.load_kube_config()
    return client.BatchV1Api(), client.CoreV1Api()


def resolve_archive_path(archive: str) -> Path | None:
    """Return absolute path under BACKUP_DIR or None if unsafe/invalid."""
    if archive == "latest":
        return None
    if not ARCHIVE_RE.match(archive):
        return None
    base = backup_dir().resolve()
    try:
        target = (backup_dir() / archive).resolve(strict=False)
    except OSError:
        return None
    try:
        target.relative_to(base)
    except ValueError:
        return None
    return target


def list_archives() -> list[ArchiveInfo]:
    items: list[ArchiveInfo] = []
    root = backup_dir()
    if not root.is_dir():
        return items
    for path in root.glob("vaultwarden-*.tar.gz"):
        if not ARCHIVE_RE.match(path.name):
            continue
        resolved = resolve_archive_path(path.name)
        if resolved is None or not resolved.is_file():
            continue
        st = resolved.stat()
        items.append(
            ArchiveInfo(
                name=path.name,
                size=st.st_size,
                size_h=_human(st.st_size),
                mtime=datetime.fromtimestamp(st.st_mtime, tz=timezone.utc),
            )
        )
    items.sort(key=lambda x: x.mtime, reverse=True)
    return items


def _job_status_fields(j: client.V1Job) -> JobInfo:
    succeeded = (j.status.succeeded or 0) > 0
    failed = (j.status.failed or 0) > 0
    is_active = (j.status.active or 0) > 0
    if succeeded:
        status = "Succeeded"
    elif failed:
        status = "Failed"
    elif is_active:
        status = "Running"
    else:
        status = "Pending"
    ann = j.metadata.annotations or {}
    return JobInfo(
        name=j.metadata.name,
        succeeded=succeeded,
        failed=failed,
        active=is_active,
        archive=ann.get("vaultwarden.restore/archive", "?"),
        by=ann.get("vaultwarden.restore/by", ""),
        status=status,
        started_at=getattr(j.metadata, "creation_timestamp", None),
        finished_at=getattr(j.status, "completion_time", None),
    )


def list_jobs() -> tuple[list[JobInfo], list[JobInfo]]:
    if state.settings.dry_run:
        return [], []
    batch, _ = _k8s()
    jobs = batch.list_namespaced_job(
        restore_namespace(), label_selector=JOB_LABEL
    )
    active: list[JobInfo] = []
    recent: list[JobInfo] = []
    for j in jobs.items:
        entry = _job_status_fields(j)
        if entry.active or entry.status == "Pending":
            active.append(entry)
        else:
            recent.append(entry)
    recent.sort(key=lambda x: x.name, reverse=True)
    return active, recent[:10]


def job_logs(job_name: str, *, tail_lines: int = 200) -> str:
    if state.settings.dry_run:
        return "(dry-run: no cluster logs)"
    if not job_name.startswith(JOB_NAME_PREFIX):
        return "invalid job name"
    _, core = _k8s()
    ns = restore_namespace()
    pods = core.list_namespaced_pod(ns, label_selector=f"job-name={job_name}")
    if not pods.items:
        return "no pods yet"
    pod = pods.items[0].metadata.name
    try:
        return core.read_namespaced_pod_log(pod, ns, tail_lines=tail_lines)
    except ApiException as exc:
        return f"logs unavailable: {exc.reason}"


def get_job(job_name: str, *, include_logs: bool = True) -> JobInfo | None:
    if not job_name.startswith(JOB_NAME_PREFIX):
        return None
    if state.settings.dry_run:
        return JobInfo(
            name=job_name,
            succeeded=False,
            failed=False,
            active=False,
            archive="latest",
            status="NotFound",
            logs="(dry-run)",
        )
    batch, _ = _k8s()
    try:
        j = batch.read_namespaced_job(job_name, restore_namespace())
    except ApiException:
        return None
    info = _job_status_fields(j)
    if include_logs:
        info.logs = job_logs(job_name)
    return info


class RestoreError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


def create_restore_job(
    *,
    archive: str,
    confirm: str,
    force: bool,
    actor: str,
) -> str:
    if confirm.strip() != "RESTORE":
        raise RestoreError("confirm must be exactly RESTORE", 400)
    if not force:
        raise RestoreError("force is required", 400)

    if archive != "latest":
        path = resolve_archive_path(archive)
        if path is None:
            raise RestoreError("invalid archive name", 400)
        if not path.is_file():
            raise RestoreError(f"archive not found: {archive}", 404)

    if state.settings.dry_run:
        ts = time.strftime("%y%m%d%H%M%S", time.gmtime())
        name = f"{JOB_NAME_PREFIX}{ts}-dry"
        ring.emit(
            f"{actor}: dry-run restore archive={archive} job={name}",
            "INFO",
        )
        return name

    with _create_lock:
        batch, _ = _k8s()
        active, _ = list_jobs()
        if active:
            raise RestoreError("a restore job is already running", 409)

        ts = time.strftime("%y%m%d%H%M%S", time.gmtime())
        job_name = f"{JOB_NAME_PREFIX}{ts}"
        ns = restore_namespace()
        force_flag = "true"

        job = client.V1Job(
            api_version="batch/v1",
            kind="Job",
            metadata=client.V1ObjectMeta(
                name=job_name,
                namespace=ns,
                labels={"app": "vaultwarden-ui-restore"},
                annotations={
                    "vaultwarden.restore/archive": archive,
                    "vaultwarden.restore/force": force_flag,
                    "vaultwarden.restore/by": actor or "unknown",
                    "cronjob.kubernetes.io/instantiate": "manual",
                },
            ),
            spec=client.V1JobSpec(
                backoff_limit=1,
                ttl_seconds_after_finished=86400,
                template=client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(
                        labels={"app": "vaultwarden-ui-restore"}
                    ),
                    spec=client.V1PodSpec(
                        service_account_name="vaultwarden-restore",
                        restart_policy="Never",
                        containers=[
                            client.V1Container(
                                name="restore",
                                image="alpine/k8s:1.37.1",
                                image_pull_policy="IfNotPresent",
                                env=[
                                    client.V1EnvVar(
                                        name="RESTORE_ENABLED", value="true"
                                    ),
                                    client.V1EnvVar(
                                        name="RESTORE_ARCHIVE", value=archive
                                    ),
                                    client.V1EnvVar(
                                        name="RESTORE_FORCE", value=force_flag
                                    ),
                                    client.V1EnvVar(
                                        name="VW_REPLICAS", value=vw_replicas()
                                    ),
                                ],
                                command=["/bin/bash", "/scripts/orchestrate.sh"],
                                volume_mounts=[
                                    client.V1VolumeMount(
                                        name="scripts", mount_path="/scripts"
                                    ),
                                    client.V1VolumeMount(
                                        name="backup", mount_path="/backup"
                                    ),
                                ],
                            )
                        ],
                        volumes=[
                            client.V1Volume(
                                name="scripts",
                                config_map=client.V1ConfigMapVolumeSource(
                                    name="vaultwarden-restore",
                                    default_mode=0o755,
                                ),
                            ),
                            client.V1Volume(
                                name="backup",
                                persistent_volume_claim=client.V1PersistentVolumeClaimVolumeSource(
                                    claim_name="vaultwarden-backups"
                                ),
                            ),
                        ],
                    ),
                ),
            ),
        )
        try:
            batch.create_namespaced_job(ns, job)
        except ApiException as exc:
            raise RestoreError(f"failed to create job: {exc.reason}", 500) from exc

    ring.emit(
        f"{actor}: started restore archive={archive} job={job_name}",
        "WARN",
    )
    return job_name
