from __future__ import annotations

from dataclasses import dataclass

from kubernetes import client, config
from kubernetes.client.rest import ApiException

from app.config import WorkloadSpec, state
from app.logs import ring


@dataclass
class WorkloadStatus:
    id: str
    namespace: str
    deployment: str
    desired: int
    ready: int
    available: int
    schedule: bool
    description: str
    dry_run: bool = False


_dry_replicas: dict[str, int] = {}


def _apps_api() -> client.AppsV1Api:
    try:
        config.load_incluster_config()
    except config.ConfigException:
        config.load_kube_config()
    return client.AppsV1Api()


def get_status(spec: WorkloadSpec) -> WorkloadStatus:
    if state.settings.dry_run:
        desired = _dry_replicas.get(spec.id, spec.target_replicas)
        return WorkloadStatus(
            id=spec.id,
            namespace=spec.namespace,
            deployment=spec.deployment,
            desired=desired,
            ready=desired,
            available=desired,
            schedule=spec.schedule,
            description=spec.description,
            dry_run=True,
        )
    api = _apps_api()
    try:
        dep = api.read_namespaced_deployment(spec.deployment, spec.namespace)
    except ApiException as exc:
        ring.emit(f"get {spec.id}: {exc.reason}", "ERROR")
        raise
    status = dep.status
    return WorkloadStatus(
        id=spec.id,
        namespace=spec.namespace,
        deployment=spec.deployment,
        desired=int(dep.spec.replicas or 0),
        ready=int(status.ready_replicas or 0) if status else 0,
        available=int(status.available_replicas or 0) if status else 0,
        schedule=spec.schedule,
        description=spec.description,
    )


def scale(spec: WorkloadSpec, replicas: int, actor: str = "system") -> WorkloadStatus:
    replicas = max(0, int(replicas))
    if state.settings.dry_run:
        _dry_replicas[spec.id] = replicas
        ring.emit(f"{actor}: scale {spec.id} → {replicas} (dry-run)", "INFO")
        return get_status(spec)
    api = _apps_api()
    body = {"spec": {"replicas": replicas}}
    try:
        api.patch_namespaced_deployment_scale(
            name=spec.deployment,
            namespace=spec.namespace,
            body=body,
        )
    except ApiException as exc:
        ring.emit(f"{actor}: scale {spec.id} failed: {exc.reason}", "ERROR")
        raise
    ring.emit(f"{actor}: scale {spec.id} → {replicas}", "INFO")
    return get_status(spec)


def start(spec: WorkloadSpec, actor: str = "system") -> WorkloadStatus:
    return scale(spec, spec.target_replicas, actor=actor)


def stop(spec: WorkloadSpec, actor: str = "system") -> WorkloadStatus:
    return scale(spec, 0, actor=actor)
