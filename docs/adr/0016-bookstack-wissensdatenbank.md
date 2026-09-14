# ADR-0016: BookStack als zentrale Wissensdatenbank

- **Status:** Accepted
- **Datum:** 2026-09-14
- **Kontext:** `apps/bookstack/`, Host `book.stadthagen.dev`

## Kontext

Minilab-Dokumentation liegt verteilt in Git (README, ADRs, App-READMEs). Nicht-IT-Nutzer brauchen eine browserbasierte, strukturierte Wissensbasis mit Suche, Rollen und SSO — ohne die GitOps-Quelle der Wahrheit aufzugeben.

## Entscheidung

- **BookStack** wird als User-App unter Argo CD betrieben (intern `book.stadthagen.dev`, kein Pangolin).
- Helm-Chart **gabe565/bookstack** (linuxserver-Image) wird nach [ADR-0014](0014-helm-strategie.md) als committed `helm-manifest.yaml` deployed; MariaDB als Plain YAML (kein Bitnami-Subchart).
- Authentik OIDC ist die Login-Methode ([ADR-0010](0010-authentik-idp.md)); lokale Passwort-Auth bleibt deaktiviert.
- SMTP (Alertmanager-Relay) wird vorbereitet, aber nicht erzwungen.
- App-Backup/Restore folgt [ADR-0015](0015-backup-restore-cronjobs.md) (NFS CronJob + Bootstrap-Restore).
- Inhalte: Git hält Vorlagen und Markdown-Quellen unter `docs/bookstack/`; Live-Bücher in BookStack werden nach Deploy importiert/gepflegt (zweigleisig).

## Konsequenzen

- Neuer Namespace/App `bookstack`, Secrets via SecretSpec.
- Doku-Pflege: Git für Plattform-Wahrheit, BookStack für Lesbarkeit und Nicht-IT-Anleitungen.
- Theme-Module (statt Plugins) sind optional und versionssensitiv — siehe [ADR-0017](0017-bookstack-theme-modules.md).
