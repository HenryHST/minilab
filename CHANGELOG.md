# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.8.0] - 2026-09-24

GitOps-Härtung (plain directory / ApplicationSet), BookStack-Wiki, Registry, Baseline Alerting, ADRs 0001–0017. Begleit-Release Plattform: [Infra_LAB v1.6.0](https://github.com/HenryHST/Infra_LAB/releases/tag/v1.6.0).

### Added

- `bookstack` — BookStack Wiki on `book.stadthagen.dev` (gabe565 Helm → committed `helm-manifest.yaml`, MariaDB, Authentik OIDC, SMTP prepared, NFS backup/restore); ADRs 0016/0017; Git content under `docs/bookstack/`
- Architecture Decision Records under [`docs/adr/`](docs/adr/) (GitOps, Plain Directory, ApplicationSet, TLS, Longhorn, Authentik, Pangolin, Alerting, Helm strategy, backups, BookStack, …)
- `registry` — full Distribution `registry:3` GitOps stack under `infra/registry/` (Deployment, ClusterIP, PVC, config, weekly GC CronJob, Traefik `registry.stadthagen.dev`, NetworkPolicy); digest-pinned image
- `registry-ui` — Joxit docker-registry-ui (Helm 1.1.4 / image 2.6.0) via ApplicationSet `infra`; namespace `registry-ui`, host `registry-ui.stadthagen.dev`; proxies `kube-registry:5000`; Authentik ForwardAuth **enabled** (`middleware-authentik.yaml`)
- Baseline Alerting (V1+V2) — PrometheusRules (`homelab-alerts.yaml`: workload, platform, Proxmox pve-exporter, Cilium) + PodMonitors für Cilium/Hubble + Loki Ruler LogQL rules (Proxmox syslog) → Alertmanager; critical/warning E-Mail routes; `promtool` tests under `infra/kube-prometheus-stack/tests/`; design/runbook in `ALERTING.md`
- `pangolin-publish` — registered via ApplicationSet `infra` (replaces standalone Application CR)
- `status` (Uptime Kuma) — Kubernetes startup, readiness, and liveness probes (`extra/healthcheck` + HTTP `/`)
- `status` — Pod Security: `enforce: baseline` (ICMP/`NET_RAW`), `audit/warn: restricted`; Local PV/PVC replaces hostPath in pod specs
- ApplicationSet `infra` — plain YAML for `registry`, `system-upgrade-controller`, `alloy` (no `kustomization.yaml`; avoids CMP `:8081`)
- All user apps under `apps/` — plain directory (no `kustomization.yaml`); Helm apps use committed `helm-manifest.yaml` (`headlamp`, `termix`, `unifipoller`); `web` uses static `configmap.yaml`
- ApplicationSet `infra` — auto-registers `infra/cert-manager`, `infra/newt`, `infra/metrics-server`, `infra/registry` (homelab-style; sync-wave 0)
- BookStack-Bücher **Home Assistant** (Zigbee/Matter/Homematic/Bluetooth) und erweiterte Minilab-Kapitel; E-Mail bei HA-Buch-Änderungen

### Changed

- `infra/registry` Service `kube-registry` from LoadBalancer → ClusterIP (expose via Traefik only); PVC auf **2Gi** `longhorn-loki-local` + Worker-Pin (Disk-Headroom)
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

- **registry**: Before first sync, remove any out-of-band `kube-registry` workload that shares `app: kube-registry` (see `infra/registry/README.md`). Service is no longer LoadBalancer — use `registry.stadthagen.dev` or ClusterDNS. Create DNS for `registry.stadthagen.dev`. Create Authentik Outpost `ak-outpost-registry-ui` or registry-ui ForwardAuth will fail.
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
