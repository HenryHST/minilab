# Betrieb

## Checks

Intervall 1 Minute. Pushover nach 3 Fehlern, Entwarnung nach 2 Erfolgen.

| Gruppe | Bedingung | Was der Check beweist |
|--------|-----------|------------------------|
| `homelab` | HTTP 200 | Authentik, IT Tools, Paperless, BookStack |
| `apps` | HTTP 200 | Die App antwortet selbst (Tools, Homepage, Vaultwarden `/alive`, Longhorn, Headlamp und weitere) |
| `plattform` | HTTP 200 auf dem Health-Pfad | Grafana, Prometheus, Alertmanager, Loki, Argo CD |
| `sso` | `ignore-redirect`, Status 302 oder 401 | Traefik und der Authentik-Outpost antworten. n8n, Hubble und Registry UI erwarten 302, Stirling PDF erwartet 401 |
| `extern` | HTTP 200, Mail zusätzlich TCP 465 | Pangolin und `mail.henrystadthagen.de`. Port 465 ist der SMTP-Relay der Apps |

Gatus folgt Redirects. Ohne `ignore-redirect` landet ein ForwardAuth-Dienst auf der Authentik-Loginseite und der Check wird grün, obwohl die App nicht antwortet. In der Gruppe `sso` wird der Redirect deshalb nicht verfolgt.

Paperless bleibt auf HTTP 200. Ein 503 ist ein Ausfall.

## Wartung

NFS-Backup-CronJobs haben ein Fenster von 30 Minuten ab der Cron-Minute, Zeitzone UTC. In dem Fenster geht kein Pushover raus. Longhorn-Snapshots zählen nicht: die laufen online.

| Start | Checks |
|-------|--------|
| 02:00 | Vaultwarden |
| 03:00 | Termix, Audiobookshelf |
| 03:30 | n8n |
| 04:00 | BookStack |
| 05:00 | Authentik, Paperless |
| 06:00 | ByteStash |
| 07:00 | Karakeep |

## Öffentliche Übersicht

`https://status.stadthagen.dev/uebersicht` zeigt nur die Health-Badges und verlangt kein Login. Die Homepage bettet die Seite ein. Historie und die volle Liste bleiben hinter OIDC.

Ein neuer Check braucht ein Bild auf dieser Seite. Der Badge-Schlüssel ist `gruppe_name`, zum Beispiel `extern_mail-smtp`.

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
