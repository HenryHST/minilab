# Forgejo (git.stadthagen.dev)

Self-hosted Git + **Lab container registry** (replaces Distribution `registry.stadthagen.dev`).

| Item | Value |
|------|--------|
| App | Forgejo **16.0.6** (Helm chart **17.3.1**) |
| Namespace | `forgejo` |
| Sync wave | `3` (AppSet `dev`) |
| Nodes | App: `nxk3-w05` + `nxk3-w06`; Actions runner: **only** `nxk3-w06` (DinD sidecar — no host `docker.sock`) |
| DB | SQLite on Longhorn (CNPG prep in values — not cut over) |
| Ext | `git-ext.stadthagen.dev` via pangolin-publish **`enabled: false`** |
| Backup | CronJob → RustFS bucket `forgejo-backups` |

## Secrets (Infra_LAB `k3s_secrets`)

| Secret | Keys |
|--------|------|
| `forgejo-oauth` | `key`=`forgejo`, `secret`=`FORGEJO_OAUTH_CLIENT_SECRET` |
| `forgejo-smtp` | `passwd` from `AUTHENTIK_EMAIL_PASSWORD` (mailer section) |
| `forgejo-admin` | `username` / `password` / `email` |
| `forgejo-backup-s3` | RustFS AWS_* + `S3_BUCKET` |
| `forgejo-runner` | optional `token`; if missing, runner init mints via admin API (`forgejo-admin`) |
| `registry-pull` | dockerconfig for `git.stadthagen.dev` |

## Registry cutover

1. Push/mirror images: `crane copy registry.stadthagen.dev/<path> git.stadthagen.dev/<owner>/<image>:<tag>`
2. Retarget Image Updater + workload image refs to `git.stadthagen.dev`
3. Confirm `registry` / `registry-ui` removed from AppSet `ops` (done) and prune
4. Drop UniFi DNS `registry` / `registry-ui` when unused

## Restore

See Infra_LAB BookStack book **forgejo** → Backup/Restore. Download archive from `s3://forgejo-backups`, scale Forgejo to 0, extract into PVC `/data`, scale up.
