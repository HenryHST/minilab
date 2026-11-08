# podcraft

k3s workload control plane for minilab (Classic sidebar SPA) + Vaultwarden restore API/UI.

- Lab image (SoT): `git.stadthagen.dev/dev/podcraft:<semver>`
- Forgejo repo: https://git.stadthagen.dev/dev/podcraft (`.forgejo/workflows/image.yml`)
- SemVer: file [`VERSION`](VERSION) (current **0.2.0**)
- Runtime host: `https://podcraft.stadthagen.dev`
- OpenAPI: `/openapi.json`, Swagger `/docs` (behind ForwardAuth)
- Bookstack (Infra_LAB): `docs/bookstack/books/k3s/25-podcraft-*.md` + `12-podcraft-image-pull.md`
- UI mockups: Infra_LAB `docs/mockups/podcraft/`

App sources + Dockerfile: Forgejo `dev/podcraft` (sync from this tree). K8s manifests stay here.

## Features

- Scale registered Deployments via OpenAPI / Dashboard
- Day/Night scheduler (default 06:30–23:45 `Europe/Berlin`)
- Sidebar SPA: Dashboard, Schedule, Vaultwarden Restore, Settings, Logs (group-filtered)
- Auth: Authentik ForwardAuth (OIDC) for UI; HTTP Basic for HA workloads only (`PODCRAFT_AUTH_MODE=both`)
- Groups: `podcraft_admins` (full); `vaultwarden_admins` (restore + settings)
- Restore: `GET/POST /api/v1/restore/*` — Jobs remain in NS `vaultwarden`
- HA credentials: Settings → rotate (Secret `podcraft-ha-basic`)
- Self-hosted Inter fonts; no Google Fonts CDN
- Runs as UID/GID `10001`

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `PODCRAFT_AUTH_MODE` | `oidc` | `oidc` \| `basic` \| `both` \| `none` (**never** `none` in cluster) |
| `PODCRAFT_BASIC_*` / `PODCRAFT_HA_BASIC_SECRET` | see Deployment | HA Basic |
| `PODCRAFT_WORKLOADS_FILE` | `/config/workloads.json` | Workload registry |
| `PODCRAFT_SCHEDULE_*` | see Deployment | Schedule window |
| `PODCRAFT_DRY_RUN` | `false` | In-memory scale / fake restore jobs (local) |
| `BACKUP_DIR` | `/backup` | NFS RO mount of Vaultwarden archives |
| `VW_RESTORE_NAMESPACE` | `vaultwarden` | Job namespace |
| `VW_REPLICAS` | `1` | Replicas after restore |

## Local dry-run

```bash
cd apps/dev/podcraft
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
mkdir -p /tmp/vw-backup
PODCRAFT_AUTH_MODE=none PODCRAFT_DRY_RUN=true BACKUP_DIR=/tmp/vw-backup \
  uvicorn app.main:app --reload --port 8080
```

## Restore merge notes

Former `vw-restore` / `restore-ui` Deploy is removed. See `../vaultwarden/RESTORE-UI-MERGED.md`.
RBAC: `../vaultwarden/podcraft-restore-rbac.yaml`. PVC: `backups-pvc.yaml`.

## Home Assistant

1. Settings → **HA-Passwort rotieren**
2. Copy into HA `secrets.yaml`
3. Package: [`examples/homeassistant/`](examples/homeassistant/)

## Argo / replicas

Apps `drawio` and `it-tools` use `ignoreDifferences` on `Deployment.spec.replicas`.
