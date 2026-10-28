# Betrieb

## Checks

Intervalle: Kernsysteme **1 Minute**, die meisten Apps/SSO/Storage **2 Minuten**, Extern **5 Minuten**. Client-Timeout 10s. Pushover nach **4** Fehlern, Entwarnung nach 2 Erfolgen.

| Gruppe | Bedingung | Was der Check beweist |
|--------|-----------|------------------------|
| `homelab` | HTTP 200 | Authentik, IT Tools, Paperless, BookStack |
| `apps` | HTTP 200 | Die App antwortet selbst (Tools, Homepage, Vaultwarden `/alive`, Longhorn, Headlamp und weitere) |
| `plattform` | HTTP 200 auf dem Health-Pfad | Grafana, Prometheus, Alertmanager, Loki, Argo CD, WUD |
| `sso` | `ignore-redirect`, Status **302** | Traefik und der Authentik-Outpost antworten (Hubble, Registry UI, Stirling PDF) |
| `storage` | HTTP 200 | RustFS LAN `/health` und Console-OIDC-Provider |
| `extern` | HTTP 200, Mail zusätzlich TCP 465 | Pangolin und `mail.henrystadthagen.de`. Port 465 ist der SMTP-Relay der Apps |

Gatus folgt Redirects. Ohne `ignore-redirect` landet ein ForwardAuth-Dienst auf der Authentik-Loginseite und der Check wird grün, obwohl die App nicht antwortet. In der Gruppe `sso` wird der Redirect deshalb nicht verfolgt.

Paperless bleibt auf HTTP 200. Ein 503 ist ein Ausfall.

## Stabilität

- **Ein** Gatus-Pod (`RollingUpdate`). Kein Horizontal-Scaling: Gatus hat keine Leader-Election (Upstream-Issue #176); zwei Pods würden Checks und Pushover verdoppeln.
- Historie: CloudNativePG mit **2 Instanzen** (Primary + Standby), 2Gi Longhorn.
- PriorityClass `gatus-prefer`. Meta-Alerts in PrometheusRule `gatus-alerts` (Deployment down, Scrape down, weniger als 2 Postgres-Instanzen).
- Details: App-README `apps/monitoring/gatus/README.md`.

## Wartung

NFS-Backup-CronJobs haben ein Fenster von 30 Minuten ab der Cron-Minute, Zeitzone UTC (außer Authentik). In dem Fenster geht kein Pushover raus. Longhorn-Snapshots zählen nicht: die laufen online.

| Start | Checks |
|-------|--------|
| 02:00 UTC | Vaultwarden |
| 02:30 / 11:50 Europe/Berlin | Authentik (scale-to-0 Backup) |
| 03:00 UTC | Termix, Audiobookshelf |
| 04:00 UTC | BookStack |
| 05:00 UTC | Paperless |
| 06:00 UTC | ByteStash |
| 07:00 UTC | Karakeep |
| 14:00 UTC | Vaultwarden |

## Öffentliche Übersicht

`https://status.stadthagen.dev/uebersicht` zeigt Health-Badges und verlangt kein Login. Die Homepage bettet die Seite ein. Historie und die volle Liste bleiben hinter OIDC.

Ein neuer Gatus-Check braucht ein Bild auf dieser Seite. Der Badge-Schlüssel ist `gruppe_name`, zum Beispiel `extern_mail-smtp`. Abschnitte: homelab, apps, plattform (inkl. WUD), sso, **storage** (RustFS), extern.

### nXk3 cluster / pis (Kromgo)

Oben auf der Übersicht:

| Abschnitt | Badges |
|-----------|--------|
| **nXk3 cluster** | `nodes_ready`, `nodes_notready`, `disk_pressure`, `memory_pressure`, `root_free_min`, `longhorn_ready`, `cilium_unavailable` |
| **nXk3 pis** | `pi1cl_ready`, `pi2cl_ready`, `pi4cl_ready`, `pi7cl_ready` |

`longhorn_ready` zählt nur Proxmox-Disk-Nodes (`worker=true`). Pis sind keine Longhorn-Disks und **keine** Gatus-HTTP-/ICMP-Endpoints (ADR-0034). Kromgo ist LAN-only (ADR-0019). Alerts: PrometheusRule `nxk3-node-stability`. Details: Infra_LAB Buch K3s → Observability Phase 4.

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

Secrets kommen aus SecretSpec, nicht aus dem Dump. Sync-Reihenfolge: Secrets → CNPG → Gatus (siehe App-README Runbook).

## Metriken

Gatus liefert `/metrics`. Der Chart legt einen ServiceMonitor mit Label `release: kube-prometheus-stack` an. Die Postgres-Instanz hat einen eigenen PodMonitor `gatus-instances`.
