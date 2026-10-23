# Changelog — Buch BookStack

## [1.3.0] - 2026-10-23

### Added

- OIDC Relink-Job (`bookstack-oidc-relink`) als Dauerhafte Absicherung nach Authentik-Restore; Runbook dry-run → apply
- Incident-Hinweis 2026-10-23: `SESSION_DOMAIN` (419) + erneuter `external_auth_id`-Drift

### Changed

- Kapitel OIDC-Login Fehleranalyse: Relink von Empfehlung auf umgesetzt; Runbook erweitert

## [1.2.0] - 2026-10-19

### Added

- **OIDC-Login Fehleranalyse** (Incident 2026-10-19): Auto-Initiate State-Race + `external_auth_id`-Drift nach Authentik-Restore; Mermaid-Sequenzen/Flowcharts

## [1.1.0] - 2026-10-18

### Added

- Übersicht: Kommentare global deaktiviert (`app-disable-comments` via GitOps-Bootstrap)

## [1.0.0] - 2026-10-17

### Added

- Erstes Buch: Übersicht, **PDF-Export Fehleranalyse** (Incident 2026-10-17: FPM memory/timeout, Font-Ownership, `content-export`), Quellen
