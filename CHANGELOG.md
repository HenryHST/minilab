# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Vaultwarden Restore-UI** — `https://vw-restore.stadthagen.dev` (ForwardAuth, `vaultwarden_admins`), Dark-Vault-Look; wählt Archiv inkl. `latest` und startet Restore-Job. Day-0 Blueprint `day0-vw-restore`.
- **Gatus (#115)** — ersetzt Uptime Kuma. Helm-Chart `gatus` 1.5.0 (v5.34.0) in Namespace `status`, URL `status.stadthagen.dev`. CloudNativePG (PG 16), Authentik-OIDC (`gatus_admins`), Pushover, ServiceMonitor. ADR-0034. Buch `gatus`. Archify `gatus-architektur`.
- **WUD 9.3.0** — `apps/ops/wud` (ApplicationSet `ops`, Wave 3, Namespace `wud`, `wupd.stadthagen.dev`). Nur melden: Kubernetes-Watcher (ClusterRole `wud-reader`, nur get/list) und interne Registry `registry.stadthagen.dev`. Meldungen per Pushover (Trigger `NXK3`) und MQTT mit Home-Assistant-Discovery. Login per Authentik-OIDC (`wupd_admins`/`wupd_users`, `DEFAULTROLE=none`). Image digest-gepinnt, PVC `wud-store`, ServiceMonitor; `/metrics` nicht öffentlich geroutet. Secret `wud-env` aus Infra_LAB `k3s_secrets`.
- **WUD-Monitoring** — Grafana-Dashboard `grafana-dashboard-wud` (upstream `overview.json` 9.3.0), PrometheusRule `wud-alerts` (Scrape down, Trigger-Fehler, leerer Watcher) und Gatus-Endpoint `wud` (`/health`, Pushover).
- **Buch `wud`** (v1.0.0, 7 Kapitel) — Archify `wud-architektur` und `wud-update-flow` mit PNG-Exporten.
- **Buch `vaultwarden`** (v1.0.0, 9 Kapitel) — Deploy, DOMAIN/`vw-ext`, OIDC, Secrets, Pangolin, Backup/Restore, Betrieb.

### Changed

- **Vaultwarden Backup** — Cron `0 2,14 * * *`, Retention 14; Gatus-Wartung 02:00 und 14:00 UTC; Buch v1.1.0 (Argo Create Job + Restore-UI).
- **Anleitungen Zugang** — Vaultwarden-URL auf `vw-ext.stadthagen.dev`; Verweis auf Ops-Buch.
- **Backup** — der 01:00-UTC-Slot ist `pg_dump` von Gatus statt tar von Uptime Kuma (ADR-0015).
- **Homepage** — Link auf Gatus; das Uptime-Kuma-Widget entfällt (die Seite liegt hinter OIDC).
- **Pangolin publish** — Public-Hosts `bookstack-ext` → `book-ext`, `vaultwarden-ext` → `vw-ext` (BookStack `APP_URL`, Vaultwarden `DOMAIN`, `pangolin-publish` niceId/subdomain/DNS).

### Removed

- **Uptime Kuma** — App `status`, Namespace `uptimekuma`, SQLite-PVC. ADR-0012 ist abgelöst.

## [0.13.0] - 2026-10-07

Authentik auf CloudNativePG und gemeinsamem Redis, Trivy Operator, Termix-Postgres, Mosquitto-LDAP-Preflight, Kyverno-Audit (in den ApplicationSets aus). Begleit-Release Plattform: [Infra_LAB v1.12.0](https://github.com/HenryHST/Infra_LAB/releases/tag/v1.12.0).

### Added

- **CloudNativePG (#70)** — Wave-1 Helm-App `apps/infra/cloudnative-pg`: Operator 1.28.0 (Chart 0.27.0) in `cnpg-system`, ServiceAccount `postgres-cloud-sa`, PodMonitor, NetworkPolicy; ADR-0030.
- **Termix auf CloudNativePG** — Cluster `termix` (1 Instanz, PG 16, 1 Gi Longhorn), Service `termix-rw`; Backup/Restore `PGHOST=termix-rw`.
- **Authentik auf CloudNativePG** — Postgres von Bitnami auf den Operator umgestellt.
- **Trivy Operator** — Wave-1 Helm-App `apps/ops/trivy-operator` (Chart 0.32.1) in `trivy-system`; `ignoreUnfixed`, Exclude `kube-system`/`trivy-system`, ServiceMonitor; ADR-0031; Archify `trivy-architektur`.
- **kubeconfig-user** — Chart in `apps/ops` mit cluster-admin Job; Image `alpine/k8s`.
- **Kyverno** — Audit-Admission mit BookStack-Doku.
- **BookStack** — Bücher `cheat-sheets` v1.0.0, `authentik` v1.1.0, `longhorn` v1.0.0, `termix` v1.0.0, `cloudnative-pg` v1.4.0, `trivy-operator` v1.1.0, `mosquitto` v1.2.0.
- **GitHub** — `CODEOWNERS`, Issue- und Pull-Request-Vorlagen.

### Changed

- **Authentik Redis** — `AUTHENTIK_REDIS__HOST=redis.redis.svc.cluster.local`, Namespace `authentik` in `redis-ingress`, Server-Speicher 1 Gi Request / 3 Gi Limit. Login-HTML p90 bei ~130 ms.
- **Trivy Operator (#91)** — eingebauter Trivy-Server, `service.headless: false`, Grafana-Dashboard gnetId 17813; höheres Memory-Limit.
- **Mosquitto** — Broker `ghcr.io/henryhst/mosquitto-custom:1.1.1` (glibc, amd64). Exporter auf den laufenden Digest `sha256:241570341cd144c27ca0952255a2726a4964b7397bfed93a98707b32eb06858c` (kein Semver-Tag). Init `ldap-preflight` wartet auf den LDAP-Outpost und meldet Bind-Fehler vor dem Broker-Start.
- **CloudNativePG Backup** — Volume-Snapshots für Termix alle 6 Stunden (Klasse `longhorn`). PodMonitor, Alerts `cnpg-alerts`, Grafana-Application `cnpg-grafana`. Kein WAL-Archiv.
- **Argo CD ApplicationSets** — `info` und UI-Prefs in den Templates. Kyverno in den Sets aus, damit die API entlastet wird.
- **BookStack Jobs** — Import und Theme-Sync wählen den laufenden App-Pod (`instance=bookstack`, `phase=Running`) und setzen Requests/Limits. Debug-Ausgaben entfernt.
- **k8tz** — Requests und Limits für das Kyverno-Init-Container.
- **Images** — n8n v2.43.0, code-server v4.140.0, Meilisearch v1.54.3, `alpine/k8s` v1.37.1.

### Fixed

- **Termix ServiceAccount** — `automountServiceAccountToken` wird nicht mehr ignoriert. PodMonitor heißt `termix-instances`.
- **Termix Argo-Diff** — `GUACD_TUNNEL_HOST` nur noch einmal (`127.0.0.1`).

## [0.12.0] - 2026-09-30

Mosquitto MQTT (#90) mit LDAP, Prometheus-$SYS-Exporter, Smoke-Probe und BookStack/Archify. Begleit-Release Plattform: [Infra_LAB v1.10.0](https://github.com/HenryHST/Infra_LAB/releases/tag/v1.10.0).

### Added

- **Mosquitto (#90)** — Wave-1 App `apps/infra/mosquitto`: go-auth LDAP → Authentik Outpost, LB `192.168.0.218` (1883/8883/9001), Certificate `mqtt-pro.stadthagen.dev`, Grafana MQTT datasource/dashboard; ADR-0029; BookStack-Buch `mosquitto`
- **Mosquitto metrics & probe** — `sys_interval 10`, `sapcc/mosquitto-exporter` + ServiceMonitor, Grafana Prometheus-Dashboard **Mosquitto Broker ($SYS)**, `mqtt-tools` + CronJob `mqtt-smoke`; BookStack v1.1.0 + Archify `mosquitto-architektur`
- **n8n (#87)** — Wave-3 App `apps/dev/n8n`: 8gears Helm → `helm-manifest.yaml`, Postgres, Traefik ForwardAuth (`ak-outpost-n8n`), Webhook-Bypass, SMTP, NFS Backup/Restore; ADR-0028; Homepage Tools; BookStack-Buch `n8n`
- **Audiobookshelf E-Mail** — PostSync Job `audiobookshelf-email` (Wave 7) setzt BookStack-SMTP (`mail.henrystadthagen.de:465`) per `PATCH /api/emails/settings`; Secret `audiobookshelf-smtp` in Infra_LAB (#86)

### Changed

- BookStack-Buch `audiobookshelf` v1.1.0 — SMTP/OIDC/Init PostSync-Waves dokumentiert; ADR-0027 + App-README
- ADR-0015 — n8n Backup-Zeile (03:30 UTC)

## [0.11.0] - 2026-09-27

Apps-Buckets (#72), Authentik/ByteStash NFS Backup/Restore, Wave-3 Apps (ByteStash/SearXNG/Kromgo/k8tz). Begleit-Release Plattform: [Infra_LAB v1.9.0](https://github.com/HenryHST/Infra_LAB/releases/tag/v1.9.0).

### Added

- **ADR-0022** — Workloads under `apps/{infra,monitoring,ops,dev}/`; four ApplicationSets + AppProjects; bootstrap Application `gitops-bootstrap` (#72)
- `apps/dev/bytestash` — Snippet-Store mit Authentik OIDC (#69); NFS backup 06:00 UTC + bootstrap restore
- `apps/ops/authentik` — NFS backup 05:00 UTC (`pg_dump` + `/media`) + bootstrap restore ([ADR-0015](docs/adr/0015-backup-restore-cronjobs.md))
- Wave-3: `searxng` (#65), `kromgo` (#67), `k8tz` (#68); Stirling-PDF locale/2GB upload/mail (#66)
- Archify workflows: `app-nfs-backup`, `app-bootstrap-restore`
- BookStack: ByteStash `04-backup-restore`; Auto-Import Workflow + `scripts/bookstack-import/`

### Fixed

- Grafana `grafana-data` PVC on Immediate Longhorn SC (post-#72 cutover)
- ByteStash Longhorn StorageClass / worker node pin

### Notes

- Restore bleibt bewusst getoggelt (`*-restore.enabled`); Secrets nicht im Archive
- Branding-Media-Sync ≠ Authentik-Backup

## [0.10.0] - 2026-09-26

Hubble UI Exposure + Authentik ForwardAuth (ADR-0018). Begleit-Release Plattform: [Infra_LAB v1.8.0](https://github.com/HenryHST/Infra_LAB/releases/tag/v1.8.0).

### Added

- `apps/ops/hubble-ui` — Certificate, IngressRoute, NetworkPolicy, ForwardAuth-Middleware für `hubble.stadthagen.dev` (kein zweites UI-Helm-Release)
- Day-0 Blueprint `day0-hubble-ui` — Proxy Provider + Outpost `ak-outpost-hubble-ui`; App-Logo `branding/hubble-light-1.svg` (Authentik Media)

### Notes

- Workload (Relay/UI Deployments) bleibt Infra_LAB Ansible `cni_cilium` (`cilium_hubble_*`)
- Seit v0.9.0 mit enthalten: BookStack Offline-Export/PDF-Fonts/SMTP, Authentik media-sync PostSync, Termix 2.8.0, diverse Renovate-Bumps

## [0.9.0] - 2026-09-25

Authentik cluster IdP (`apps/ops/authentik`) inkl. Day-0 registry-ui Outpost-Blueprint; ForwardAuth wieder aktiv. Begleit-Release Plattform: [Infra_LAB v1.7.0](https://github.com/HenryHST/Infra_LAB/releases/tag/v1.7.0).

### Added

- `apps/ops/authentik` — GitOps IdP auf `idp.stadthagen.dev` (Helm 2026.8, Longhorn PG, Media PVC + NFS sync CronJob, IngressRoute/TLS)
- Day-0 Blueprints — Proxy Provider + Outpost `ak-outpost-registry-ui` via ConfigMap `authentik-blueprints-day0` / Helm `blueprints.configMaps` ([`BLUEPRINTS.md`](apps/ops/authentik/BLUEPRINTS.md)); Ownership mit Infra_LAB ADR-0017

### Changed

- Application `authentik` — `targetRevision: main` (nicht mehr Feature-Branch)
- `registry-ui` — ForwardAuth Middleware wieder aktiv (#56), nachdem Day-0 Outpost bereitsteht

### Notes

- IdP-Config (OAuth-Flotte, LDAP, Brand) bleibt Infra_LAB OpenTofu / `--tags authentik-bootstrap`
- Renovate bumps seit v0.8.0 (actions/checkout v7, gluetun, code-server, netshoot, send-mail) sind in diesem Tag enthalten

## [0.8.0] - 2026-09-24

GitOps-Härtung (plain directory / ApplicationSet), BookStack-Wiki, Registry, Baseline Alerting, ADRs 0001–0017. Begleit-Release Plattform: [Infra_LAB v1.6.0](https://github.com/HenryHST/Infra_LAB/releases/tag/v1.6.0).

### Added

- `bookstack` — BookStack Wiki on `book.stadthagen.dev` (gabe565 Helm → committed `helm-manifest.yaml`, MariaDB, Authentik OIDC, SMTP prepared, NFS backup/restore); ADRs 0016/0017; Git content under `docs/bookstack/`
- Architecture Decision Records under [`docs/adr/`](docs/adr/) (GitOps, Plain Directory, ApplicationSet, TLS, Longhorn, Authentik, Pangolin, Alerting, Helm strategy, backups, BookStack, …)
- `registry` — full Distribution `registry:3` GitOps stack under `apps/ops/registry/` (Deployment, ClusterIP, PVC, config, weekly GC CronJob, Traefik `registry.stadthagen.dev`, NetworkPolicy); digest-pinned image
- `registry-ui` — Joxit docker-registry-ui (Helm 1.1.4 / image 2.6.0) via ApplicationSet `infra`; namespace `registry-ui`, host `registry-ui.stadthagen.dev`; proxies `kube-registry:5000`; Authentik ForwardAuth **enabled** (`middleware-authentik.yaml`)
- Baseline Alerting (V1+V2) — PrometheusRules (`homelab-alerts.yaml`: workload, platform, Proxmox pve-exporter, Cilium) + PodMonitors für Cilium/Hubble + Loki Ruler LogQL rules (Proxmox syslog) → Alertmanager; critical/warning E-Mail routes; `promtool` tests under `apps/monitoring/kube-prometheus-stack/tests/`; design/runbook in `ALERTING.md`
- `pangolin-publish` — registered via ApplicationSet `infra` (replaces standalone Application CR)
- `status` (Uptime Kuma) — Kubernetes startup, readiness, and liveness probes (`extra/healthcheck` + HTTP `/`)
- `status` — Pod Security: `enforce: baseline` (ICMP/`NET_RAW`), `audit/warn: restricted`; Local PV/PVC replaces hostPath in pod specs
- ApplicationSet `infra` — plain YAML for `registry`, `system-upgrade-controller`, `alloy` (no `kustomization.yaml`; avoids CMP `:8081`)
- All user apps under `apps/` — plain directory (no `kustomization.yaml`); Helm apps use committed `helm-manifest.yaml` (`headlamp`, `termix`, `unifipoller`); `web` uses static `configmap.yaml`
- ApplicationSet `infra` — auto-registers `apps/ops/cert-manager`, `apps/ops/newt`, `apps/monitoring/metrics-server`, `apps/ops/registry` (homelab-style; sync-wave 0)
- BookStack-Bücher **Home Assistant** (Zigbee/Matter/Homematic/Bluetooth) und erweiterte Minilab-Kapitel; E-Mail bei HA-Buch-Änderungen

### Changed

- `apps/ops/registry` Service `kube-registry` from LoadBalancer → ClusterIP (expose via Traefik only); PVC auf **2Gi** `longhorn-loki-local` + Worker-Pin (Disk-Headroom)
- Longhorn storage over-provisioning **200%**
- Renovate packageRules for `registry` / `alpine/k8s` (kube-registry) and Joxit chart/image (registry-ui)
- AppProject `infrastruktur` moved to `apps/argocd-apps/raw/` (managed by Application `infra-applicationset`); removed Application `infrastruktur-project` and `bootstrap/` — fixes missing project for Longhorn / ApplicationSet apps; destinations use `server: "*"`
- All Application manifests in `apps/argocd-apps/` use `targetRevision: main` instead of `HEAD` (fixes `revision HEAD must be resolved` on homelab / child apps)
- `stirling-pdf` — Worker-Pin + höhere Memory/Metaspace-Limits (OOM / Bad Gateway)
- `status` — Longhorn `longhorn-loki-local` (1 Replica) + Worker-Pin
- `grafana` — `grafana-data` PVC neu auf `longhorn-loki-local` 2Gi

### Fixed

- cert-manager — DNS01 nameservers via Helm controller config; CRD/webhook order; `extraObjects` as Helm tpl string
- ApplicationSet / homelab — CMP `:8081` vermeiden (kein Kustomize auf User-Apps; finalizer bei Migration standalone → infra)
- termix-postgres Service YAML document separator
- AppProject `infrastruktur` für Longhorn und infra-Apps

### Migration notes

- **registry**: Before first sync, remove any out-of-band `kube-registry` workload that shares `app: kube-registry` (see `apps/ops/registry/README.md`). Service is no longer LoadBalancer — use `registry.stadthagen.dev` or ClusterDNS. Create DNS for `registry.stadthagen.dev`. Create Authentik Outpost `ak-outpost-registry-ui` or registry-ui ForwardAuth will fail.
- After sync: old Applications `cert-manager`, `newt`, `metrics-server`, `pangolin-publish` are replaced by ApplicationSet-generated apps with the same names
- Requires Argo CD ApplicationSet controller (bundled with argo-cd Helm chart)
- If old `pangolin-publish` Application hangs in Terminating while ApplicationSet recreates it: `kubectl patch application pangolin-publish -n argocd --type merge -p '{"metadata":{"finalizers":null}}'` then refresh ApplicationSet `infra`
- After AppProject move: `argocd app sync infra-applicationset`; delete orphan `infrastruktur-project` if present (`argocd app delete infrastruktur-project --cascade=orphan`)

## [0.7.0] - 2026-08-26

Parallel ownership: `pangolin-publish` owns k3s Newt public resources **and** their Hetzner DNS A records.

### Added

- `pangolin-publish` — PostSync Job upserts Pangolin public resources (`termix-ext`, `idp`) on Newt site `k3s`; toggle via ConfigMap `resources.json`
- **Hetzner DNS** in reconcile — upsert A → `pangolinPublicIp` when `dns: true`; delete A when `enabled: false`
- ConfigMap: `dnsZone`, `pangolinPublicIp`; Secret `pangolin-api` keys `api-key` + `hetzner-token`
- Termix NetworkPolicy: allow ingress from `traefik` + `newt` (+ in-namespace)
- Authentik `idp.stadthagen.dev` target cutover to `authentik-server.authentik.svc:80`

### Changed

- Termix: dual access — internal `termix.stadthagen.dev` (Traefik) unchanged; public via Pangolin
- README: ownership table vs Terraform (no dual-write of the same hostname)

## [0.6.0] - 2026-08-25

### Added

- App-of-Apps under `apps/argocd-apps/` with sync waves; AppProject `infrastruktur` (parent Application `homelab` from Infra_LAB)
- `longhorn` — Longhorn v1.12.1, NFS backup target
- `grafana` — Helm chart; Authentik generic OAuth (local login + SSO); provisioned dashboards (UniFi Poller, Argo CD, Authentik, Home Assistant)
- `prometheus` — scrape jobs for Proxmox exporters, Pangolin, Home Assistant, Unpoller, Authentik, Argo CD metrics; configmap-reload sidecar
- `grafana-loki` — Loki + Grafana datasource wiring
- `alertmanager` — alert routing wired with Prometheus/Grafana
- `newt` — Pangolin tunnel agent
- `unifipoller` — Unpoller Helm + Grafana dashboards
- `termix` — Termix Helm + Postgres HA, Authentik OIDC
- `vaultwarden` — Vaultwarden 1.37.2 with Authentik SSO; daily NFS backup CronJob
- `headlamp` — Headlamp 0.45.0 in `kube-system` with cert-manager/Gatekeeper plugins; login SA + long-lived token Secret
- cert-manager — Hetzner DNS-01 webhook, ClusterIssuer, Certificates for IngressRoute apps
- `web` (Homepage) — image v2.1.2; Argo CD service widget (`HOMEPAGE_VAR_ARGOCD_KEY`)
- Uptime Kuma (`status`) — daily NFS backup CronJob

### Changed

- Grafana: `oauth_auto_login: false` so password and Authentik SSO both work; role mapping via `Grafana Admins` / `Grafana Editors`
- Loki storage: Longhorn PVC / node pinning and related disk-pressure fixes
- Termix: HA chart, OIDC admin group, hostPath/PVC sizing fixes
- AppProject destinations include `kube-system` for cert-manager RBAC

### Notes

- Traefik IngressRoutes use cert-manager Certificates (`*-tls`); Longhorn is the default StorageClass where applicable

## [0.5.0] - 2026-08-23

### Added

- GitOps layout under `apps/` with README documentation
- `cert-manager` — jetstack/cert-manager v1.19.0 (namespace `certmanager`)
- `omni-tools` — iib0011/omni-tools:0.6.0 (`omni-tools.stadthagen.dev`)
- `it-tools` — corentinth/it-tools:2024.10.22-7ca5933 (`it-tools.stadthagen.dev`)
- `pgweb` — sosedoff/pgweb:0.17.0 (`pgweb.stadthagen.dev`)
- `web` — gethomepage/homepage v1.13.2 (`web.stadthagen.dev`, namespace `homepage`)
- `drawio` — jgraph/drawio:28.2.5 (`drawio.stadthagen.dev`)
- `status` — louislam/uptime-kuma:2.0.0-beta.4 (`status.stadthagen.dev`, namespace `uptimekuma`)

### Notes

- Traefik IngressRoutes use TLS secret `stadthagen-tls` (copy from `traefik` ns)
- Uptime Kuma uses hostPath `/var/lib/uptimekuma` (no StorageClass on cluster)
