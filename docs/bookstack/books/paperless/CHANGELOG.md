# Changelog — Buch Paperless

## [1.7.0] - 2026-10-24

### Added

- Kapitel **Trivy & CVE-Hygiene**: Image-Pins (`paperless-ngx:3.3.4`, `gotenberg:8.38.0`, `k8s-toolbox:1.0.1`), akzeptierte Residuals bis Upstream

### Changed

- Smoke-Kapitel / Deploy: Verweis auf Helper-Pin **1.0.1** und CVE-Hygiene-Kapitel

## [1.6.1] - 2026-10-24

### Changed

- Kapitel **Gotenberg & Tika Smoke**: PDF A4 — Trivy und Rohlog jeweils auf eigener Seite

## [1.6.0] - 2026-10-24

### Added

- Kapitel **Gotenberg & Tika Smoke**: Paperless-API-Checks (Secret `paperless-gt-smoke`), App-Version/Image im Bericht, optionale Trivy-Karte (`TRIVY_REPORT`, Default an), Berichtssprache `REPORT_LANG=de|en` (Default `de`)

## [1.5.0] - 2026-10-23

### Changed

- Kapitel **Gotenberg & Tika Smoke**: Verdict-Karten SMOKE/SYS, Checklisten, Backup-Ampel (App-Cron + CNPG-Snapshot); Betreff `SMOKE=… SYS=…`

## [1.4.0] - 2026-10-23

### Changed

- Kapitel **Gotenberg & Tika Smoke**: Systemzustand (Workloads/CNPG/PVC/HPA/CronJobs/Health) + PDF-Anhang per Gotenberg Chromium; SA `paperless-gt-smoke`

## [1.3.0] - 2026-10-23

### Added

- Kapitel **Gotenberg & Tika Smoke**: CronJob `paperless-gt-smoke`, Image-Bump-Verify
- SeeCode: `paperless-gt-smoke`, `paperless-gt-smoke-flow` (HTML + PNG/SVG)

## [1.2.0] - 2026-10-14

### Added

- Kapitel **OIDC-Gruppen**: Access vs. Dokumentrechte, Membership, PostSync-Provisionierung
- Archify: `paperless-oidc-groups`, `paperless-groups-provision` (HTML + PNG)

## [1.0.1]

### Added

- typos


## [1.1.0] - 2026-10-08

### Added

- Storage-Übersicht (CNPG vs. hostPath vs. NFS) in Übersicht
- Deploy & Verify: Local Storage auf `nxk3-w01`, Ansible-/Manual-Anlage, Troubleshooting `FailedMount`

## [1.0.0] - 2026-09-27

### Added

- Erstes Buch: Übersicht, Deploy & Verify, Quellen
