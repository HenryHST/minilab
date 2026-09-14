# Backup & Restore

## Schichten

1. **Longhorn**-Volume-Backups → NFS (Cluster-Storage)
2. **App-CronJobs** → NFS `192.168.0.25:/var/nfs/shared/infra01/<app>-backups` (Retention typisch 7)

## Zeitplan (UTC)

| App | Cron | Inhalt |
|-----|------|--------|
| status (Uptime Kuma) | 01:00 | SQLite/data tar |
| vaultwarden | 02:00 | `/data` tar |
| termix | 03:00 | `pg_dump` |
| **bookstack** | **04:00** | MariaDB dump + `/config` |

## Bootstrap-Restore

ConfigMap `<app>-restore` → `enabled=true` (bei vorhandenen Daten `force=true`), Argo Sync, danach sofort `enabled=false` committen.

BookStack: siehe `apps/bookstack/README.md`. NAS-Ordner vorher: `mkdir -p /var/nfs/shared/infra01/bookstack-backups`.

ADR: 0015, 0009.
