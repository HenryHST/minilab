# Gatus (`status`)

Argo Application `gatus` → namespace `status`, URL `https://status.stadthagen.dev`.

Replaces Uptime Kuma. Historical Kuma monitors and the SQLite file are not imported.

## Layout

| Piece | Where |
|-------|--------|
| Helm values | `values.yaml` (chart `gatus` 1.5.0, app v5.34.0) |
| Namespace, TLS, IngressRoute, CNPG, backup | `manifests/` |
| Secrets | Infra_LAB SecretSpec → `gatus-db`, `gatus-env` (see `secret.example.yaml`) |

OIDC issuer `https://idp.stadthagen.dev/application/o/gatus/`. Redirect `https://status.stadthagen.dev/authorization-code/callback`. Authentik group `gatus_admins` is the access gate (Gatus itself has no admin/viewer split).

## Endpoints

HTTP 200, interval 1m, Pushover after 3 failures: Authentik, IT Tools, Paperless, BookStack.

## Backup / Restore

- CronJob `gatus-backup-cron` (01:00 UTC): `pg_dump` → NFS `192.168.0.25:/var/nfs/shared/infra01/gatus-backups` (retention 7)
- Longhorn VolumeSnapshot `gatus-snapshot` every 6h
- Manuell: `kubectl -n status create job --from=cronjob/gatus-backup-cron gatus-backup-manual`
- Bootstrap: ConfigMap `gatus-restore` → `enabled=true` (+ `force=true` if tables exist) → Argo Sync → danach sofort `enabled=false` committen
- NAS: `mkdir -p /var/nfs/shared/infra01/gatus-backups`

## Before the first sync

1. Letztes Kuma-Backup: `kubectl -n uptimekuma create job --from=cronjob/kuma-backup-cron kuma-backup-manual`
2. SecretSpec `GATUS_DB_PASSWORD`, `GATUS_OAUTH_CLIENT_SECRET` (gleicher Wert wie `gatus_oauth_client_secret`), `GATUS_PUSHOVER_APP_TOKEN`; User-Key ist `PUSHOVER_USER_KEY`
3. `ansible-playbook site.yaml --tags secrets`
4. Authentik dev reconcile (Uptime Kuma aus, Gatus an)
