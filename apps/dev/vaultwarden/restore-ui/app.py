import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from kubernetes import client, config
from kubernetes.client.rest import ApiException

BACKUP_DIR = Path(os.environ.get("BACKUP_DIR", "/backup"))
NAMESPACE = os.environ.get("NAMESPACE", "vaultwarden")
VW_REPLICAS = os.environ.get("VW_REPLICAS", "1")
ARCHIVE_RE = re.compile(r"^vaultwarden-\d{8}-\d{6}\.tar\.gz$")

app = FastAPI(title="Vaultwarden Restore")
templates = Jinja2Templates(directory="/app/templates")
app.mount("/static", StaticFiles(directory="/app/static"), name="static")

def k8s():
    try:
        config.load_incluster_config()
    except config.ConfigException:
        config.load_kube_config()
    return client.BatchV1Api(), client.CoreV1Api()

def list_archives():
    items = []
    if not BACKUP_DIR.is_dir():
        return items
    for p in BACKUP_DIR.glob("vaultwarden-*.tar.gz"):
        if not ARCHIVE_RE.match(p.name):
            continue
        st = p.stat()
        items.append(
            {
                "name": p.name,
                "size": st.st_size,
                "size_h": _human(st.st_size),
                "mtime": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc),
            }
        )
    items.sort(key=lambda x: x["mtime"], reverse=True)
    return items

def _human(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"

def running_restore_jobs(batch: client.BatchV1Api):
    jobs = batch.list_namespaced_job(
        NAMESPACE, label_selector="app=vaultwarden-ui-restore"
    )
    active = []
    recent = []
    for j in jobs.items:
        name = j.metadata.name
        succeeded = (j.status.succeeded or 0) > 0
        failed = (j.status.failed or 0) > 0
        is_active = (j.status.active or 0) > 0
        entry = {
            "name": name,
            "succeeded": succeeded,
            "failed": failed,
            "active": is_active,
            "archive": (j.metadata.annotations or {}).get(
                "vaultwarden.restore/archive", "?"
            ),
        }
        if is_active:
            active.append(entry)
        else:
            recent.append(entry)
    recent.sort(key=lambda x: x["name"], reverse=True)
    return active, recent[:5]

def job_logs(core: client.CoreV1Api, job_name: str) -> str:
    pods = core.list_namespaced_pod(
        NAMESPACE, label_selector=f"job-name={job_name}"
    )
    if not pods.items:
        return "(no pods yet)"
    pod = pods.items[0].metadata.name
    try:
        return core.read_namespaced_pod_log(pod, NAMESPACE, tail_lines=80)
    except ApiException as e:
        return f"(logs unavailable: {e.reason})"

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    batch, _ = k8s()
    archives = list_archives()
    active, recent = running_restore_jobs(batch)
    user = request.headers.get("X-authentik-username", "")
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "archives": archives,
            "active": active,
            "recent": recent,
            "user": user,
            "error": None,
            "notice": None,
        },
    )

@app.post("/restore", response_class=HTMLResponse)
def restore(
    request: Request,
    archive: str = Form(...),
    confirm: str = Form(""),
    force: str = Form(""),
):
    batch, core = k8s()
    archives = list_archives()
    active, recent = running_restore_jobs(batch)
    user = request.headers.get("X-authentik-username", "")
    ctx = {
        "request": request,
        "archives": archives,
        "active": active,
        "recent": recent,
        "user": user,
        "error": None,
        "notice": None,
    }

    if active:
        ctx["error"] = "A restore job is already running."
        return templates.TemplateResponse("index.html", ctx, status_code=409)

    if confirm.strip() != "RESTORE":
        ctx["error"] = 'Type RESTORE to confirm.'
        return templates.TemplateResponse("index.html", ctx, status_code=400)

    if archive != "latest" and not ARCHIVE_RE.match(archive):
        ctx["error"] = "Invalid archive name."
        return templates.TemplateResponse("index.html", ctx, status_code=400)

    if archive != "latest" and not (BACKUP_DIR / archive).is_file():
        ctx["error"] = f"Archive not found: {archive}"
        return templates.TemplateResponse("index.html", ctx, status_code=404)

    force_flag = "true" if force == "on" else "false"
    ts = time.strftime("%y%m%d%H%M%S", time.gmtime())
    job_name = f"vaultwarden-ui-restore-{ts}"

    job = client.V1Job(
        api_version="batch/v1",
        kind="Job",
        metadata=client.V1ObjectMeta(
            name=job_name,
            namespace=NAMESPACE,
            labels={"app": "vaultwarden-ui-restore"},
            annotations={
                "vaultwarden.restore/archive": archive,
                "vaultwarden.restore/force": force_flag,
                "vaultwarden.restore/by": user or "unknown",
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
                            image="alpine/k8s:1.32.0",
                            image_pull_policy="IfNotPresent",
                            env=[
                                client.V1EnvVar(name="RESTORE_ENABLED", value="true"),
                                client.V1EnvVar(name="RESTORE_ARCHIVE", value=archive),
                                client.V1EnvVar(name="RESTORE_FORCE", value=force_flag),
                                client.V1EnvVar(name="VW_REPLICAS", value=VW_REPLICAS),
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
        batch.create_namespaced_job(NAMESPACE, job)
    except ApiException as e:
        ctx["error"] = f"Failed to create job: {e.reason}"
        return templates.TemplateResponse("index.html", ctx, status_code=500)

    return RedirectResponse(url=f"/jobs/{job_name}", status_code=303)

@app.get("/jobs/{job_name}", response_class=HTMLResponse)
def job_status(request: Request, job_name: str):
    batch, core = k8s()
    user = request.headers.get("X-authentik-username", "")
    try:
        j = batch.read_namespaced_job(job_name, NAMESPACE)
    except ApiException:
        return templates.TemplateResponse(
            "job.html",
            {
                "request": request,
                "user": user,
                "job_name": job_name,
                "status": "NotFound",
                "archive": "?",
                "logs": "Job not found",
                "active": False,
            },
            status_code=404,
        )
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
    return templates.TemplateResponse(
        "job.html",
        {
            "request": request,
            "user": user,
            "job_name": job_name,
            "status": status,
            "archive": (j.metadata.annotations or {}).get(
                "vaultwarden.restore/archive", "?"
            ),
            "logs": job_logs(core, job_name),
            "active": is_active or status == "Pending",
        },
    )
