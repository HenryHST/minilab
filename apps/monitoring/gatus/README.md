# Gatus (`status`)

Argo Application `gatus` → namespace `status`, URL `https://status.stadthagen.dev`.

Replaces Uptime Kuma. Historical Kuma monitors and the SQLite file are not imported.

## Layout

| Piece | Where |
|-------|--------|
| Helm values | `values.yaml` (chart `gatus` 1.5.0, app v5.37.0) |
| Namespace, TLS, IngressRoute, CNPG, backup, PriorityClass | `manifests/` |
| Secrets | Infra_LAB SecretSpec → `gatus-db`, `gatus-env` (see `secret.example.yaml`) |
| Meta-alerts | `../kube-prometheus-stack/manifests/gatus-alerts.yaml` |

OIDC issuer `https://idp.stadthagen.dev/application/o/gatus/`. Redirect `https://status.stadthagen.dev/authorization-code/callback`. Authentik group `gatus_admins` is the access gate (Gatus itself has no admin/viewer split).

## Stability

| Topic | Choice |
|-------|--------|
| App replicas | **1** — chart hardcodes `replicas: 1`; Gatus has no leader election ([upstream #176](https://github.com/TwiN/gatus/issues/176)). Scaling causes duplicate checks and Pushover spam. |
| Deploy strategy | `RollingUpdate` (new pod before old) |
| Resources | request 256Mi / limit 768Mi; `concurrency: 5`; client timeout 10s |
| Priority | PriorityClass `gatus-prefer` |
| Postgres | CloudNativePG **2 instances**, 2Gi Longhorn, pod anti-affinity by hostname |
| Check intervals | Core 1m; most apps/SSO/storage 2m; extern 5m; Pushover after **4** failures |
| NetPol egress | Open on purpose (HTTP/TCP probes + OIDC + Postgres) |

Do **not** add a PDB or second Gatus replica until upstream HA ships.

## Endpoints

Pushover after 4 failures, resolve after 2 successes. Group `homelab` stays HTTP 200: Authentik, IT Tools, Paperless, BookStack. Group `apps` is HTTP 200 on the app itself. Group `plattform` hits health paths (incl. WUD). Group `sso` sets `ignore-redirect` and expects **302** (Hubble, Registry UI, Stirling PDF). Group `storage`: RustFS health + console OIDC. Group `extern` is Pangolin (HTTP 200) plus mail (`https://mail.henrystadthagen.de` and `tcp://mail.henrystadthagen.de:465`).

NFS backup CronJobs get a 30-minute maintenance window from the cron minute (timezone UTC for most apps). Authentik uses two Europe/Berlin windows (`02:30` and `11:50`, 30m each) matching scale-to-0 backup CronJobs. In those windows Gatus sends no Pushover alert. Longhorn snapshots are not a window.

`https://status.stadthagen.dev/uebersicht` is anonymous and shows health badges (`manifests/overview.yaml`). The dashboard and its history stay behind OIDC. A new Gatus check needs an `<img>` there; the badge key is `group_name`. Each badge/section uses an HTML `title` for hover tooltips (check expectation, e.g. SSO ForwardAuth → 302).

Section **nXk3 cluster** embeds Kromgo PromQL badges (Ready / Pressure / root free% / Longhorn / Cilium DS) from `https://kromgo.stadthagen.dev/badges/<id>` — not Gatus HTTP endpoints. Kromgo is LAN-only (ADR-0019); badges load on the homepage embed and LAN clients.

## Grafana

Prometheus scrapes Gatus via ServiceMonitor `gatus` (namespace `status`). Dashboard ConfigMap: [`../kube-prometheus-stack/manifests/dashboard-gatus.yaml`](../kube-prometheus-stack/manifests/dashboard-gatus.yaml).

| Item | Value |
|------|--------|
| URL | `https://grafana.stadthagen.dev/d/gatus` |
| Folder | **Gatus** |
| UID | `gatus` |
| Datasource | Prometheus (`uid: prometheus`) |

Useful Explore queries:

```promql
gatus_results_endpoint_success
gatus_results_duration_seconds
sum by (name) (rate(gatus_results_total{success="true"}[5m]))
  / sum by (name) (rate(gatus_results_total[5m]))
gatus_results_certificate_expiration_seconds - time()
```

## Runbook

### Sync order (first install / secret rotate)

1. SecretSpec keys present: `GATUS_DB_PASSWORD`, `GATUS_OAUTH_CLIENT_SECRET`, `GATUS_PUSHOVER_APP_TOKEN`, `PUSHOVER_USER_KEY`
2. `ansible-playbook site.yaml --tags secrets` (Infra_LAB) → Secrets `gatus-db`, `gatus-env` in `status`
3. Argo sync Application `gatus` (CNPG wave 0, then Helm Deployment)
4. Authentik OIDC app `gatus` must exist (Terraform)

Missing secrets → CNPG/Gatus CrashLoop. Fix secrets, then hard-refresh Argo.

### Status page down

```bash
kubectl -n status get deploy,pods,cluster
kubectl -n status describe deploy gatus
kubectl -n status logs deploy/gatus --tail=100
kubectl -n status get cluster gatus -o yaml | less
```

Meta-alerts: `GatusDeploymentUnavailable`, `GatusScrapeDown`, `GatusPostgresInstancesMissing` (PrometheusRule `gatus-alerts`).

### Restore drill

1. ConfigMap `gatus-restore`: `enabled=true` (+ `force=true` if tables exist)
2. Argo Sync → PostSync Job restores from NFS
3. Immediately commit `enabled=false`
4. Confirm: UI history + `kubectl -n status get pods`

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
