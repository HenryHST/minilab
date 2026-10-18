---
title: Übersicht
book_version: "1.1.0"
---


# Übersicht

> **Buch** v1.1.0 · Stand: 2026-10-18

BookStack ist die Wissensdatenbank unter https://book.stadthagen.dev (LAN) und https://book-ext.stadthagen.dev (Internet / Pangolin). GitOps: Argo ApplicationSet `dev`, Namespace `bookstack`, Manifeste unter [`apps/dev/bookstack/`](../../../../apps/dev/bookstack/).

| | |
|--|--|
| Image | `lscr.io/linuxserver/bookstack` (Pin im App-README) |
| DB | MariaDB 11.4 (eigenes StatefulSet) |
| Auth | Authentik **OIDC** (`AUTH_METHOD=oidc`) |
| PDF | dompdf + Noto Sans; FPM `memory_limit=512M`, `max_execution_time=300` |
| Comments | **Global aus** — Setting `app-disable-comments=true` (Bootstrap), kein Kommentar-UI |
| Docs-Import | CronJob + PostSync aus Infra_LAB + minilab `docs/bookstack/` |

Ops-Details (Secrets, Theme-Modules, Backup): App-README [`apps/dev/bookstack/README.md`](../../../../apps/dev/bookstack/README.md).

### Kommentare

BookStack kennt keine Env-Variable für Kommentare. Der Schalter liegt in den App-Settings (`app-disable-comments`). Unser docs-import **`gitops-bootstrap.php`** setzt ihn idempotent auf `true` (UI-Äquivalent: Einstellungen → Funktionen & Sicherheit → Kommentare deaktivieren). Zusätzlich hat die Rolle **BookStack Familie** keine `comment-*`-Rechte.

Verify: Seiten-HTML ohne `.comments-list`; in der DB `settings` Key `app-disable-comments` = `true`.

PDF-Export bricht / Timeout / „Keine Zugriffsberechtigung“: Kapitel **PDF-Export Fehleranalyse**.
