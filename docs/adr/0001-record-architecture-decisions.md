# ADR-0001: Architekturentscheidungen als ADRs festhalten

- **Status:** Accepted
- **Datum:** 2026-09-11

## Kontext

minilab ist ein GitOps-Homelab mit vielen impliziten Entscheidungen (Argo CD, Storage, IdP, TLS, Alerting). Die Begründungen lagen verstreut in README, App-READMEs und CHANGELOG — schwer auffindbar für spätere Änderungen oder Onboarding.

## Entscheidung

Architekturentscheidungen werden als nummerierte Markdown-ADRs unter `docs/adr/` dokumentiert. Status und Index pflegen wir in [`README.md`](README.md). Operative Details bleiben in App-/Infra-READMEs; ADRs halten die *Warum*-Ebene.

## Konsequenzen

- Neue strukturelle Änderungen (GitOps-Modell, Storage, Auth, Exposure) brauchen ein ADR oder eine Status-Aktualisierung.
- Keine doppelte Runbook-Dokumentation in ADRs — Verweise auf bestehende Docs genügen.
