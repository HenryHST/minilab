# Changelog

All notable changes to this project will be documented in this file.

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
