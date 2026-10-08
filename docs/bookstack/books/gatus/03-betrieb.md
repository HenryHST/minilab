# Betrieb

## Login

Issuer `https://idp.stadthagen.dev/application/o/gatus/`. Redirect `https://status.stadthagen.dev/authorization-code/callback`.

Nur Mitglieder von `gatus_admins` bekommen ein Token. Die Gruppe `gatus_users` ist angelegt und nicht gebunden: Gatus unterscheidet keine Admin- und Leserrolle.

## Backup

| Schicht | Was |
|---------|-----|
| Longhorn | `ScheduledBackup` `gatus-snapshot`, alle 6 Stunden |
| NFS | CronJob `gatus-backup-cron`, 01:00 UTC, Retention 7, Pfad `/var/nfs/shared/infra01/gatus-backups` |

Manuell:

```bash
kubectl -n status create job --from=cronjob/gatus-backup-cron gatus-backup-manual
```

## Restore

ConfigMap `gatus-restore`: `enabled=true`. Wenn die Datenbank schon Tabellen hat, zusätzlich `force=true`. Argo Sync startet den PostSync-Job. Danach sofort `enabled=false` committen.

Secrets kommen aus SecretSpec, nicht aus dem Dump.

## Metriken

Gatus liefert `/metrics`. Der Chart legt einen ServiceMonitor mit Label `release: kube-prometheus-stack` an. Die Postgres-Instanz hat einen eigenen PodMonitor `gatus-instances`.
