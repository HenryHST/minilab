# BookStack Import-Checkliste (Phase 2)

Nach erfolgreichem Deploy von `bookstack` und Authentik-OIDC-Login als Admin:

## 1. Shelves & Bücher anlegen

1. Shelf **Plattform** → Buch **Minilab**
2. Shelf **Anleitungen** → Bücher:
   - **Erste Schritte am Homelab**
   - **Zugang & Passwörter**
   - **Status & Störungen**
   - **Home Assistant** (Step-by-Step)

## 2. Seitenvorlagen

Settings → Page Templates → aus [`templates/`](templates/) übernehmen (HTML/Markdown in BookStack-Editor einfügen und als Template speichern):

- `vorlage-runbook.md` — Ops-Runbook
- `vorlage-anleitung-nicht-it.md` — Step-by-Step für Nicht-IT
- `vorlage-adr-kurz.md` — ADR-Kurzfassung für BookStack

Optional: Default-Template pro Buch setzen.

## 3. Minilab-Inhalt übernehmen

Reihenfolge im Buch **Minilab** (Kapitel = Markdown-Dateien unter `books/minilab/`):

1. Übersicht & Links
2. Apps & Hosts
3. Sync Waves & GitOps
4. Authentik / SSO
5. Backup & Restore
6. Troubleshooting

Quellen: Root-`README.md`, `docs/adr/*`, App-READMEs. Kurz halten; auf Git verlinken wo Details nötig sind.

## 4. Nicht-IT-Anleitungen

Kapitel aus `books/anleitungen/` übernehmen (einfache Sprache, nummerierte Schritte, Screenshots später ergänzen).

## 4b. Home Assistant

Buch **Home Assistant** — Reihenfolge aus `books/home-assistant/`:

1. Überblick
2. Anmelden & App
3. Übersicht lesen
4. Lichter & Schalter
5. Klima & Heizung
6. Szenen & Automationen
7. Wenn etwas nicht klappt

URL der Instanz: `https://ha02.stadthagen.dev`

## 5. Optional: API-Import

BookStack REST API (`/api/books`, `/api/chapters`, `/api/pages`) mit Token eines Admin-Users. Für den ersten Wurf reicht manueller Import; ein Script kann später ergänzt werden.

## 6. Theme Modules (optional)

Siehe `apps/bookstack/README.md` und ADR-0017.
