# Changelog — Buch Gatus

## [1.2.1] - 2026-10-21

### Added

- `/uebersicht` Abschnitt **nXk3 pis** (Kromgo `pi1cl_ready`…`pi7cl_ready`)

### Changed

- `longhorn_ready` auf Proxmox-Disk-Nodes beschränkt; Betriebstext zu Pi vs Longhorn

## [1.2.0] - 2026-10-21

### Changed

- Stabilität: RollingUpdate, Ressourcen, Intervalle (1m/2m/5m), Pushover nach 4 Fehlern
- SSO: Stirling erwartet 302 (wie übrige ForwardAuth-Dienste)
- CNPG: 2 Instanzen, 2Gi; Overview-Badges für WUD und RustFS
- Betrieb: Runbook-Verweis, Meta-Alerts, kein Multi-Replica für die App

## [1.1.1] - 2026-10-13

### Changed

- Betrieb: Badge `cilium_unavailable`; `longhorn_ready` über `longhorn_node_status`

## [1.1.0] - 2026-10-13

### Added

- Betrieb: Abschnitt **nXk3 cluster (Kromgo)** — Phase-4 Node-Health-Badges auf `/uebersicht` (kein Gatus-Endpoint)

## [1.0.1] - 2026-10-10

### Changed

- Betrieb / Metriken: bestehende Gatus-Dokumentation (Baseline vor Kromgo-Einbettung)
