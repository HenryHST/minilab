# BookStack

Wiki / Wissensdatenbank unter **https://book.stadthagen.dev** (intern, Traefik).

## Überblick

| Komponente | Details |
|------------|---------|
| Chart | [gabe565/bookstack](https://charts.gabe565.com/charts/bookstack/) (vendored) → committed `helm-manifest.yaml` |
| Image | `lscr.io/linuxserver/bookstack:version-v26.05.5` |
| DB | MariaDB 11.4 (`mariadb.yaml`, hostPath `/var/lib/bookstack-mariadb` @ `nxk3-w01`) |
| Auth | Authentik OIDC (`AUTH_METHOD=oidc`) |
| SMTP | vorbereitet (`mail.henrystadthagen.de:25`, Secret `bookstack-smtp`) |
| Backup | CronJob 04:00 UTC → NFS `…/bookstack-backups` (DB + `/config`, Retention 7) |

## Secrets (außerhalb Git)

Vor dem ersten Sync SecretSpecs / Ansible anlegen — Vorlage: [`secret.example.yaml`](secret.example.yaml).

| Secret | Keys |
|--------|------|
| `bookstack-app` | `APP_KEY` (`docker run --rm --entrypoint /bin/bash lscr.io/linuxserver/bookstack:version-v26.05.5 appkey`) |
| `bookstack-db` | `MARIADB_PASSWORD`, `MARIADB_ROOT_PASSWORD` |
| `bookstack-oauth` | `client-secret` (Authentik Provider) |
| `bookstack-smtp` | `password` (optional, wenn Relay Auth braucht) |

## Authentik

1. Application + OAuth2/OIDC Provider, Slug `bookstack`
2. Redirect URI (strict): `https://book.stadthagen.dev/oidc/callback`
3. Post-Logout URIs: `https://book.stadthagen.dev`, `…/login`, `…/login?prevent_auto_init=true`
4. Gruppen (optional, Namen = BookStack-Rollen): z. B. `BookStack Admin`, `BookStack Editor`
5. Client-Secret → SecretSpec `bookstack-oauth`

Siehe [Authentik ↔ BookStack](https://integrations.goauthentik.io/documentation/bookstack/).

## Helm neu rendern

```bash
helm template bookstack ./charts/bookstack -f values.yaml --namespace bookstack > helm-manifest.yaml
```

## Backup / Restore

- NAS-Ordner: `mkdir -p /var/nfs/shared/infra01/bookstack-backups`
- Manuelles Backup: `kubectl -n bookstack create job --from=cronjob/bookstack-backup-cron bookstack-backup-manual`
- Bootstrap-Restore: ConfigMap `bookstack-restore` → `enabled=true` (bei vorhandener DB zusätzlich `force=true`), Argo Sync; danach sofort `enabled=false` committen

## Phase-2-Inhalte (Git)

Strukturierte Bücher, Vorlagen und Import-Anleitung: [`docs/bookstack/`](../../docs/bookstack/).

### E-Mail bei Buch-Änderungen (Home Assistant)

1. **Live-Wiki:** Nutzer beobachten das Buch *Home Assistant* in BookStack (Watch) — SMTP muss stehen (`bookstack-smtp`, Rollenrecht „Receive notifications“).
2. **Git:** Workflow [`.github/workflows/notify-home-assistant-book.yml`](../../.github/workflows/notify-home-assistant-book.yml) mailt bei Push auf `main` unter `docs/bookstack/books/home-assistant/` (Empfänger [`recipients.yaml`](../../docs/bookstack/books/home-assistant/recipients.yaml), Secrets laut [`BENACHRICHTIGUNGEN.md`](../../docs/bookstack/books/home-assistant/BENACHRICHTIGUNGEN.md)).

## Theme-Module / „Plugins“ (Vorschläge)

BookStack hat keine klassischen Plugins; ab v26.03 gibt es **Theme Modules** ([Hacks](https://www.bookstackapp.com/hacks/), [header-hacks](https://github.com/florinm03/bookstack-header-hacks)).

Empfohlen für minilab:

| Modul | Nutzen |
|-------|--------|
| `header-anchor-link` | Anker-Links an Überschriften (Teilen von Abschnitten) |
| `pdf-embed` | PDFs in Seiten einbetten (Anleitungen / Datenblätter) |
| `sticky-table-heads` | Tabellenköpfe beim Scrollen fixieren |
| `wc-n-wpm-info` | Wortzahl / Lesezeit (gut für längere Runbooks) |
| `toc-edit-mode` | Inhaltsverzeichnis im Editor |
| `open-attachments` | Anhänge (PDF) im neuen Tab öffnen |

Installation (nach Deploy, im Pod): `php artisan bookstack:install-module <url-or-zip>` — siehe ADR-0017.
