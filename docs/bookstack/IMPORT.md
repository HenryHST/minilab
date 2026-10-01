# BookStack Import-Checkliste (Phase 2)

Nach erfolgreichem Deploy von `bookstack` und Authentik-OIDC-Login als Admin:

## 1. Shelves & Bücher anlegen

1. Shelf **Plattform** → Buch **Minilab** (weitere Plattform-Bücher inkl. `cheat-sheets` kommen per Auto-Import aus `books/*/`)
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

Cluster-CronJob / PostSync in [`apps/dev/bookstack/`](../../apps/dev/bookstack/) synct Git-Sources (Infra_LAB + minilab) per REST Upsert + SemVer-Gate. Script: [`scripts/bookstack-import/import_books.py`](../../scripts/bookstack-import/import_books.py). Pro Ordner: `meta.yaml` (`book`, `shelf`, optional `mode: files_as_books`).

### Einmalig: SecretSpec (Infra_LAB) — User/Rolle/Token auto

1. `secretspec set BOOKSTACK_API_TOKEN_ID` / `BOOKSTACK_API_TOKEN_SECRET` (je ≥16 Zeichen).
2. `ansible-playbook site.yaml --tags secrets` → Secret `bookstack/bookstack-import`.
3. PostSync/CronJob legt Rolle **GitOps Import**, User `gitops-import@localhost` und Token `docs-import` automatisch an (kein UI).

Details: Infra_LAB [`docs/bookstack/IMPORT.md`](https://github.com/HenryHST/Infra_LAB/blob/main/docs/bookstack/IMPORT.md).

### Starten

- CronJob `bookstack-docs-import` (alle 6 h) + PostSync `bookstack-docs-import-bootstrap`
- Manuell: `kubectl -n bookstack create job --from=cronjob/bookstack-docs-import docs-import-manual`
- Sources: ConfigMap `bookstack-import-sources` (`docs-import-configmap.yaml`)

Lokal:

```bash
export BOOKSTACK_URL=https://book.stadthagen.dev BOOKSTACK_TOKEN_ID=… BOOKSTACK_TOKEN_SECRET=…
pip install -r scripts/bookstack-import/requirements.txt
python3 scripts/bookstack-import/import_books.py --books-dir docs/bookstack/books --dry-run
```

Manueller Copy-Paste (Abschnitte 1–4) bleibt Fallback.

## 6. Theme Modules (optional)

Siehe `apps/dev/bookstack/README.md` und ADR-0017.
