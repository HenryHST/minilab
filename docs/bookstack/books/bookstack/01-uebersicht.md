---
title: Übersicht
book_version: "1.0.0"
---


# Übersicht

> **Buch** v1.0.0 · Stand: 2026-10-17

BookStack ist die Wissensdatenbank unter https://book.stadthagen.dev (LAN) und https://book-ext.stadthagen.dev (Internet / Pangolin). GitOps: Argo ApplicationSet `dev`, Namespace `bookstack`, Manifeste unter [`apps/dev/bookstack/`](../../../../apps/dev/bookstack/).

| | |
|--|--|
| Image | `lscr.io/linuxserver/bookstack` (Pin im App-README) |
| DB | MariaDB 11.4 (eigenes StatefulSet) |
| Auth | Authentik **OIDC** (`AUTH_METHOD=oidc`) |
| PDF | dompdf + Noto Sans; FPM `memory_limit=512M`, `max_execution_time=300` |
| Docs-Import | CronJob + PostSync aus Infra_LAB + minilab `docs/bookstack/` |

Ops-Details (Secrets, Theme-Modules, Backup): App-README [`apps/dev/bookstack/README.md`](../../../../apps/dev/bookstack/README.md).

PDF-Export bricht / Timeout / „Keine Zugriffsberechtigung“: Kapitel **PDF-Export Fehleranalyse**.
