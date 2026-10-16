# Changelog — Buch Stirling PDF

## [1.3.0] - 2026-10-16

### Added

- Kapitel **SSO ForwardAuth**: Fehleranalyse Gatus-rot trotz HTTP 200 (kein Outpost/Middleware; Gatus erwartete 401 statt 302); Fix Day-0 Blueprint + Traefik FA + TF-Gruppen
- Kapitel **Uploads & OCR**: Incident „Upload to server“ `/api/v1/storage/files` (2026-10-15) — Upstream/Client-Bug iOS WebKit [#8446], Abgrenzung Traefik

### Changed

- Übersicht / Deploy & Verify: Auth = ForwardAuth; Verify erwartet unauth **302**

## [1.2.0] - 2026-10-14

### Changed

- Kapitel **Uploads & OCR**: vollständige Fehleranalyse (Hypothesen, Evidenz, Abgrenzung DiskPressure, Verify inkl. Client-Boundary-Check)

## [1.1.0] - 2026-10-14

### Added

- Kapitel **Uploads & OCR**: Traefik-Buffering entfernt (Multipart EOF), ServersTransport-Timeouts

## [1.0.0] - 2026-10-14

### Added

- Erstes Buch: Übersicht, Deploy & Verify, Ephemeral Storage, Quellen
- Dokumentiert `ephemeral-storage` Request/Limit und Beibehaltung des fat-Images
