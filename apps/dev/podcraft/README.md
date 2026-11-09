# podcraft

k3s workload control plane for minilab (Classic sidebar SPA) + Vaultwarden restore API/UI.

- Lab image (SoT): `git.stadthagen.dev/dev/podcraft:<semver>`
- Forgejo repo: https://git.stadthagen.dev/dev/podcraft (`.forgejo/workflows/image.yml`)
- SemVer: file [`VERSION`](VERSION) (current **0.4.3**)
- Runtime host: `https://podcraft.stadthagen.dev`
- OpenAPI: `/openapi.json`, Swagger `/docs`
- Auth: native Authentik OIDC (Termix-style) — **not** Gateway ExternalAuth; see `EXTERNALAUTH.md`
- Bookstack (Infra_LAB): Authentik Kap. 15, K3s 25–29; Integrations `docs/integrations/authentik/podcraft.md`
- UI mockups: Infra_LAB `docs/mockups/podcraft/`

App sources + Dockerfile: Forgejo `dev/podcraft` (sync from this tree). K8s manifests stay here.

## Features

- Scale registered Deployments via OpenAPI / Dashboard
- Day/Night scheduler (default 06:30–23:45 `Europe/Berlin`)
- Sidebar SPA: Dashboard, Schedule, Vaultwarden Restore, Settings, Logs, **Podinfo** (group-filtered)
- Podinfo lab page (`/podinfo`, `podcraft_admins`): status tiles, runtime/endpoints, readiness drain, parsed Metrics sample, fault/delay/status
- Logs: search + level filter (INFO/WARN/DEBUG/ERROR), pause/clear
- Settings: Profil / HA / Anzeige / Session tabs
- Restore: archive text filter, review strip, backup size as KB/MB
- Auth: native OIDC (`/auth/start` → callback → session cookie); HTTP Basic for HA workloads only (`PODCRAFT_AUTH_MODE=both`)
- Groups: `podcraft_admins` (full); `vaultwarden_admins` (restore + settings)
- Restore: `GET/POST /api/v1/restore/*` — Jobs remain in NS `vaultwarden`
- HA credentials: Settings → rotate (Secret `podcraft-ha-basic`)
- Self-hosted Inter fonts; no Google Fonts CDN
- Runs as UID/GID `10001`

### Observability / lab HTTP

| Path | Auth | Notes |
|------|------|-------|
| `GET /healthz` | public | Liveness |
| `GET /readyz` | public | Readiness (503 when drained) |
| `POST /readyz/enable\|disable` | admin | Drain toggle (also `/api/v1/lab/readyz/*`) |
| `GET /version` | public | SemVer + commit + build date |
| `GET /metrics` | public | Prometheus text |
| `POST /fault_injection/*` | admin | App routes → 500; probes/metrics/lab stay up |
| `GET /delay/{seconds}` | admin | 0–30s |
| `GET /status/{code}` | admin | Echo status code |

## Env

| Variable | Pflicht | Beispiel / Hinweis |
|----------|---------|-------------------|
| `PODCRAFT_OIDC_CLIENT_ID` | ja | `podcraft` |
| `PODCRAFT_OIDC_CLIENT_SECRET` | ja | Secret `podcraft-oauth` / SecretSpec `PODCRAFT_OAUTH_CLIENT_SECRET` |
| `PODCRAFT_OIDC_ISSUER_URL` | ja | `https://idp.stadthagen.dev/application/o/podcraft/` |
| `PODCRAFT_OIDC_AUTHORIZATION_URL` | ja | `https://idp.stadthagen.dev/application/o/authorize/` |
| `PODCRAFT_OIDC_TOKEN_URL` | ja | `https://idp.stadthagen.dev/application/o/token/` |
| `PODCRAFT_OIDC_USERINFO_URL` | nein | `…/application/o/userinfo/` |
| `PODCRAFT_OIDC_END_SESSION_URL` | nein | IdP logout |
| `PODCRAFT_OIDC_REDIRECT_URI` | ja | `https://podcraft.stadthagen.dev/auth/oidc/callback` |
| `PODCRAFT_OIDC_SCOPES` | nein | Default `openid email profile` |
| `PODCRAFT_OIDC_GROUP_CLAIM` | nein | Default `groups` |
| `PODCRAFT_SESSION_SECRET` | ja | Secret `podcraft-session` / SecretSpec `PODCRAFT_SESSION_SECRET` |
| `PODCRAFT_AUTH_MODE` | nein | Lab: `both` (`oidc` \| `basic` \| `both` \| `none` — **never** `none` in cluster) |
| `PODCRAFT_BASIC_*` / `PODCRAFT_HA_BASIC_SECRET` | für HA | Secret `podcraft-ha-basic` |
| `PODCRAFT_WORKLOADS_FILE` | nein | `/config/workloads.json` |
| `PODCRAFT_SCHEDULE_*` | nein | Schedule window |
| `PODCRAFT_DRY_RUN` | nein | Local fake scale/restore |
| `BACKUP_DIR` / `VW_*` | Restore | NFS RO + Job namespace |

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
