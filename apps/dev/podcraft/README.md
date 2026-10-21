# podcraft

k3s workload control plane for minilab (Pulse UI).

- Image: `ghcr.io/henryhst/podcraft:<semver>` (GHCR — lab registry is LAN-only)
- SemVer: file [`VERSION`](VERSION); optional git tag `podcraft-vX.Y.Z` or workflow_dispatch override
- Runtime host: `https://podcraft.stadthagen.dev`
- Build: GitHub Actions [podcraft-image.yml](../../../.github/workflows/podcraft-image.yml)
- OpenAPI: `/openapi.json`, Swagger `/docs` (behind ForwardAuth)

## Features

- Scale registered Deployments (`drawio`, `it-tools`) via OpenAPI
- Day/Night scheduler (default 06:30–23:45 `Europe/Berlin`)
- Pulse Web UI: login, settings, light/dark, DE/EN, floating logs, animated heartbeat
- Auth: Authentik ForwardAuth (OIDC) for UI; HTTP Basic for HA (`PODCRAFT_AUTH_MODE=both`)
- HA credentials: Settings → **Rotate HA password** (writes Secret `podcraft-ha-basic`, shown once in UI)
- Runs as UID/GID `10001` (avoids host uid/gid clashes)

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `PODCRAFT_AUTH_MODE` | `oidc` | `oidc` \| `basic` \| `both` \| `none` (deploy uses `both`) |
| `PODCRAFT_BASIC_USER` | `ha` | Basic auth user (from Secret) |
| `PODCRAFT_BASIC_PASSWORD` | _(empty)_ | Basic auth password (from Secret; rotate in UI) |
| `PODCRAFT_HA_BASIC_SECRET` | `podcraft-ha-basic` | Secret name for HA Basic |
| `PODCRAFT_WORKLOADS_FILE` | `/config/workloads.json` | Workload registry |
| `PODCRAFT_SCHEDULE_*` | see Deployment | Schedule window |
| `PODCRAFT_DRY_RUN` | `false` | In-memory scale (local) |

## Mirror to lab registry

```bash
VER=$(tr -d '[:space:]' < VERSION)
crane copy "ghcr.io/henryhst/podcraft:${VER}" "registry.stadthagen.dev/dev/podcraft:${VER}"
# Prefer digest pin in deployment.yaml + image-pull-job.yaml after first release
```

## Local dry-run

```bash
cd apps/dev/podcraft
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
PODCRAFT_AUTH_MODE=none PODCRAFT_DRY_RUN=true uvicorn app.main:app --reload --port 8080
```

## Home Assistant

1. Open Pulse **System settings** → **Rotate HA password**
2. Copy user/password into HA `secrets.yaml` on pi5cl
3. Copy HA package from [`examples/homeassistant/`](examples/homeassistant/) (see docs)

Full guide: [docs/bookstack/books/podcraft/02-home-assistant.md](../../../docs/bookstack/books/podcraft/02-home-assistant.md).  
Example package: [`examples/homeassistant/podcraft.yaml`](examples/homeassistant/podcraft.yaml).

## Argo / replicas

Apps `drawio` and `it-tools` use `ignoreDifferences` on `Deployment.spec.replicas` so podcraft live-scale is not reverted by self-heal.
