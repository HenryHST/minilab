from __future__ import annotations

from dataclasses import dataclass, field

from kubernetes import client, config
from kubernetes.client.rest import ApiException

from app.config import WorkloadSpec, state
from app.logs import ring


@dataclass
class PodInfo:
    name: str
    phase: str
    ready: bool
    restarts: int = 0


@dataclass
class ReplicaSetInfo:
    name: str
    desired: int
    current: int
    ready: int


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
    icon: str = ""
    phase: str = "Unknown"
    replicaset: ReplicaSetInfo | None = None
    pods: list[PodInfo] = field(default_factory=list)
    dry_run: bool = False


_dry_replicas: dict[str, int] = {}


def _apps_api() -> client.AppsV1Api:
    try:
        config.load_incluster_config()
    except config.ConfigException:
        config.load_kube_config()
    return client.AppsV1Api()


def _core_api() -> client.CoreV1Api:
    try:
        config.load_incluster_config()
    except config.ConfigException:
        config.load_kube_config()
    return client.CoreV1Api()


def _compute_phase(desired: int, ready: int, pods: list[PodInfo]) -> str:
    if desired <= 0 and ready <= 0:
        return "Stopped"
    if desired > 0 and ready >= desired:
        return "Running"
    if desired > 0 and ready == 0:
        failing = any(p.phase in ("Failed", "Unknown") for p in pods)
        return "Failed" if failing else "Starting"
    return "Degraded"


def _pod_ready(pod) -> bool:
    conditions = pod.status.conditions or [] if pod.status else []
    for cond in conditions:
        if cond.type == "Ready":
            return cond.status == "True"
    return False


def _pod_restarts(pod) -> int:
    total = 0
    for cs in pod.status.container_statuses or [] if pod.status else []:
        total += int(cs.restart_count or 0)
    return total


def _active_replicaset(api: client.AppsV1Api, namespace: str, deployment_name: str, uid: str) -> ReplicaSetInfo | None:
    try:
        items = api.list_namespaced_replica_set(namespace).items or []
    except ApiException as exc:
        ring.emit(f"list rs {namespace}/{deployment_name}: {exc.reason}", "WARN")
        return None
    owned: list = []
    for rs in items:
        for ref in rs.metadata.owner_references or []:
            if ref.kind == "Deployment" and ref.uid == uid:
                owned.append(rs)
                break
    if not owned:
        return None
    owned.sort(
        key=lambda r: (
            int(r.status.replicas or 0),
            r.metadata.creation_timestamp.timestamp() if r.metadata.creation_timestamp else 0,
        ),
        reverse=True,
    )
    rs = owned[0]
    return ReplicaSetInfo(
        name=rs.metadata.name,
        desired=int(rs.spec.replicas or 0),
        current=int(rs.status.replicas or 0) if rs.status else 0,
        ready=int(rs.status.ready_replicas or 0) if rs.status else 0,
    )


def _list_pods(core: client.CoreV1Api, namespace: str, match_labels: dict[str, str] | None) -> list[PodInfo]:
    if not match_labels:
        return []
    selector = ",".join(f"{k}={v}" for k, v in match_labels.items())
    try:
        items = core.list_namespaced_pod(namespace, label_selector=selector).items or []
    except ApiException as exc:
        ring.emit(f"list pods {namespace} ({selector}): {exc.reason}", "WARN")
        return []
    pods = [
        PodInfo(
            name=p.metadata.name,
            phase=(p.status.phase if p.status and p.status.phase else "Unknown"),
            ready=_pod_ready(p),
            restarts=_pod_restarts(p),
        )
        for p in items
    ]
    pods.sort(key=lambda p: p.name)
    return pods


def get_status(spec: WorkloadSpec) -> WorkloadStatus:
    if state.settings.dry_run:
        desired = _dry_replicas.get(spec.id, spec.target_replicas)
        phase = "Running" if desired > 0 else "Stopped"
        return WorkloadStatus(
            id=spec.id,
            namespace=spec.namespace,
            deployment=spec.deployment,
            desired=desired,
            ready=desired,
            available=desired,
            schedule=spec.schedule,
            description=spec.description,
            icon=spec.icon,
            phase=phase,
            dry_run=True,
        )
    api = _apps_api()
    core = _core_api()
    try:
        dep = api.read_namespaced_deployment(spec.deployment, spec.namespace)
    except ApiException as exc:
        ring.emit(f"get {spec.id}: {exc.reason}", "ERROR")
        raise
    status = dep.status
    desired = int(dep.spec.replicas or 0)
    ready = int(status.ready_replicas or 0) if status else 0
    available = int(status.available_replicas or 0) if status else 0
    match_labels = None
    if dep.spec.selector and dep.spec.selector.match_labels:
        match_labels = dict(dep.spec.selector.match_labels)
    rs = _active_replicaset(api, spec.namespace, spec.deployment, dep.metadata.uid)
    pods = _list_pods(core, spec.namespace, match_labels)
    phase = _compute_phase(desired, ready, pods)
    return WorkloadStatus(
        id=spec.id,
        namespace=spec.namespace,
        deployment=spec.deployment,
        desired=desired,
        ready=ready,
        available=available,
        schedule=spec.schedule,
        description=spec.description,
        icon=spec.icon,
        phase=phase,
        replicaset=rs,
        pods=pods,
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
