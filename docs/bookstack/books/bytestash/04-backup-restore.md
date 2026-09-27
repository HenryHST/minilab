# Backup & Restore

Tägliches NFS-Backup der Snippet-PVC und Bootstrap-Restore für Cluster-Neuaufsetzen.

## Backup

- CronJob `bytestash-backup-cron` — **06:00 UTC** ≈ 08:00 CEST
- Inhalt: tar von `/data/snippets` → `bytestash-*.tar.gz`
- Ziel: `192.168.0.25:/var/nfs/shared/infra01/bytestash-backups` (Retention 7)
- NAS vorher: `mkdir -p /var/nfs/shared/infra01/bytestash-backups`

Manuell:

```bash
kubectl -n bytestash create job --from=cronjob/bytestash-backup-cron bytestash-backup-manual
kubectl -n bytestash logs -f job/bytestash-backup-manual
```

## Restore

ConfigMap `bytestash-restore`:

1. `enabled=true` (bei vorhandenen Daten zusätzlich `force=true`)
2. Argo Sync — PostSync-Job skaliert Deployment auf 0, Worker entpackt Archiv auf `bytestash-data`, skaliert hoch
3. Sofort `enabled=false` committen

Secrets bleiben SecretSpec (`bytestash-oauth`, `bytestash-jwt`) — nicht im Archive.

Siehe [ADR-0015](../../../../adr/0015-backup-restore-cronjobs.md) und [Archify Restore](../../../../diagrams/archify/app-bootstrap-restore.html).
