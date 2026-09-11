# ADR-0005: `targetRevision: main` statt `HEAD`

- **Status:** Accepted
- **Datum:** 2026-09-11

## Kontext

Argo CD Applications mit `targetRevision: HEAD` führten zu Fehlern der Form `revision HEAD must be resolved`, insbesondere bei Multi-Source-Apps und ApplicationSets.

## Entscheidung

Alle Application- und ApplicationSet-Quellen in minilab nutzen **`targetRevision: main`** (bzw. expliziten Branch/Tag). Die Parent-App `homelab` (Infra_LAB) muss ebenfalls `main` pinnten.

## Konsequenzen

- Sync folgt dem Branch `main`; Feature-Branches werden nicht automatisch deployed.
- Kein „floating HEAD“-Verhalten mehr — vorhersehbare Revisionen.
