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

1. Voraussetzungen
2. Überblick
3. Anmelden & App
4. Übersicht lesen
5. Lichter & Schalter
6. Klima & Heizung
7. Szenen & Automationen
8. Zigbee
9. Matter
10. Homematic
11. Bluetooth
12. Wenn etwas nicht klappt

URL der Instanz: `https://ha02.stadthagen.dev`  
Ops-Doku (Admin): [`../home-assistant/ha02.md`](../home-assistant/ha02.md)


Nach dem Import: Buch in BookStack **beobachten (Watch)**, damit Nutzer bei Seitenänderungen eine E-Mail bekommen. Git-seitige Mails: siehe [`books/home-assistant/BENACHRICHTIGUNGEN.md`](books/home-assistant/BENACHRICHTIGUNGEN.md).

## 5. Automatischer Import (empfohlen)

GitHub Actions [`.github/workflows/bookstack-import.yml`](../../.github/workflows/bookstack-import.yml) synct `docs/bookstack/books/*/` per BookStack REST API. Script: [`scripts/bookstack-import/import_books.py`](../../scripts/bookstack-import/import_books.py). Pro Ordner: `meta.yaml` (`book`, `shelf`, optional `mode: files_as_books` für Anleitungen).

### Einmalig: API-Token + Secrets

1. BookStack → **Mein Konto → API Tokens** (User mit Create/Edit auf Bücher/Seiten).
2. GitHub Secrets im Repo **minilab**:

```bash
gh secret set BOOKSTACK_URL -b 'https://book.stadthagen.dev' -R HenryHST/minilab
gh secret set BOOKSTACK_TOKEN_ID -R HenryHST/minilab
gh secret set BOOKSTACK_TOKEN_SECRET -R HenryHST/minilab
```

3. Workflow läuft auf **self-hosted** Runner (LAN zu `book.stadthagen.dev`).

### Starten

- Push auf `main` unter `docs/bookstack/books/**` / `scripts/bookstack-import/**`
- Oder Actions → **BookStack import** → *Run workflow*

Lokal:

```bash
export BOOKSTACK_URL=https://book.stadthagen.dev BOOKSTACK_TOKEN_ID=… BOOKSTACK_TOKEN_SECRET=…
pip install -r scripts/bookstack-import/requirements.txt
python3 scripts/bookstack-import/import_books.py --books-dir docs/bookstack/books --dry-run
```

Manueller Copy-Paste (Abschnitte 1–4) bleibt Fallback.

## 6. Theme Modules (optional)

Siehe `apps/dev/bookstack/README.md` und ADR-0017.
