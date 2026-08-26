# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
