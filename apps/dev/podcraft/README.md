# podcraft

k3s workload control plane for minilab (Pulse UI).

- Lab image (SoT): `git.stadthagen.dev/dev/podcraft:<semver>`
- Forgejo repo: https://git.stadthagen.dev/dev/podcraft (`.forgejo/workflows/image.yml`)
- Optional GHCR: `ghcr.io/henryhst/podcraft` (dispatch-only GHA)
- SemVer: file [`VERSION`](VERSION); Forgejo tag `vX.Y.Z` or workflow_dispatch override
- Runtime host: `https://podcraft.stadthagen.dev`
- OpenAPI: `/openapi.json`, Swagger `/docs` (behind ForwardAuth)

App sources + Dockerfile live in the Forgejo repo; K8s manifests stay here under `apps/dev/podcraft/`.

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

## Local dry-run

```bash
cd apps/dev/podcraft
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
PODCRAFT_AUTH_MODE=none PODCRAFT_DRY_RUN=true uvicorn app.main:app --reload --port 8080
```

## Home Assistant

1. Open Pulse **System settings** → **Rotate HA password**
2. Copy user/password into HA `secrets.yaml` on ha02
3. Copy HA package from [`examples/homeassistant/`](examples/homeassistant/) (see docs)

Full guide: [docs/bookstack/books/podcraft/02-home-assistant.md](../../../docs/bookstack/books/podcraft/02-home-assistant.md).  
Example package: [`examples/homeassistant/podcraft.yaml`](examples/homeassistant/podcraft.yaml).

## Argo / replicas

Apps `drawio` and `it-tools` use `ignoreDifferences` on `Deployment.spec.replicas` so podcraft live-scale is not reverted by self-heal.
