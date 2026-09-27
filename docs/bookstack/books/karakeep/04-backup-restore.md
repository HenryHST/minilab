# Backup & Restore

- CronJob `karakeep-backup-cron` — **07:00 UTC** ≈ 09:00 CEST
- Inhalt: tar von `/data` → `karakeep-*.tar.gz`
- Ziel: `192.168.0.25:/var/nfs/shared/infra01/karakeep-backups` (Retention 7)
- NAS vorher: `mkdir -p /var/nfs/shared/infra01/karakeep-backups`

```bash
kubectl -n karakeep create job --from=cronjob/karakeep-backup-cron karakeep-backup-manual
kubectl -n karakeep logs -f job/karakeep-backup-manual
```

## Bootstrap-Restore

ConfigMap `karakeep-restore`:

1. `enabled=true` (bei vorhandenen Daten zusätzlich `force=true`)
2. Argo Sync — PostSync-Job skaliert STS auf 0, Worker entpackt Archiv auf `data-karakeep-0`, skaliert hoch
3. Sofort `enabled=false` committen

Meili-Index baut sich nach Restore neu auf. Secrets bleiben SecretSpec — nicht im Archive.
