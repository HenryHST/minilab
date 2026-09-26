# BookStack

Wiki / Wissensdatenbank unter **https://book.stadthagen.dev** (intern, Traefik).

## Überblick

| Komponente | Details |
|------------|---------|
| Chart | [gabe565/bookstack](https://charts.gabe565.com/charts/bookstack/) (vendored) → committed `helm-manifest.yaml` |
| Image | `lscr.io/linuxserver/bookstack:version-v26.05.5` |
| DB | MariaDB 11.4 (`mariadb.yaml`, hostPath `/var/lib/bookstack-mariadb` @ `nxk3-w01`) |
| Auth | Authentik OIDC (`AUTH_METHOD=oidc`) |
| Theme | `APP_THEME=custom` — Modules/Fonts via Argo PostSync Job |
| PDF | `EXPORT_PAGE_SIZE=a4`, dompdf + Noto Sans (GitOps) |
| SMTP | `mail.henrystadthagen.de:465`, Secret `bookstack-smtp` (Passwort = SecretSpec `AUTHENTIK_EMAIL_PASSWORD`) |
| Backup | CronJob 04:00 UTC → NFS `…/bookstack-backups` (DB + `/config`, Retention 7) |

## Secrets (außerhalb Git)

Vor dem ersten Sync SecretSpecs / Ansible anlegen — Vorlage: [`secret.example.yaml.txt`](secret.example.yaml.txt).

| Secret | Keys |
|--------|------|
| `bookstack-app` | `APP_KEY` (`docker run --rm --entrypoint /bin/bash lscr.io/linuxserver/bookstack:version-v26.05.5 appkey`) |
| `bookstack-db` | `MARIADB_PASSWORD`, `MARIADB_ROOT_PASSWORD` |
| `bookstack-oauth` | `client-secret` (Authentik Provider) |
| `bookstack-smtp` | `password` — Ansible/SecretSpec `AUTHENTIK_EMAIL_PASSWORD` (gleicher SMTP wie Authentik; nicht aus Git) |

## Authentik

1. Application + OAuth2/OIDC Provider, Slug `bookstack`
2. Redirect URI (strict): `https://book.stadthagen.dev/oidc/callback`
3. Post-Logout URIs: `https://book.stadthagen.dev`, `…/login`, `…/login?prevent_auto_init=true`
4. Gruppen (Namen = BookStack-Rollen): `Admin` / `Editor` (OIDC `groups` claim)
5. Client-Secret → SecretSpec `bookstack-oauth`

Siehe [Authentik ↔ BookStack](https://integrations.goauthentik.io/documentation/bookstack/).

## Theme modules & PDF fonts (GitOps)

Argo **PostSync**-Job [`theme-modules-sync.yaml`](theme-modules-sync.yaml) installiert fehlende Module und synct Fonts/Theme-Overlay. Artefakte liegen im Repo:

| Pfad | Inhalt |
|------|--------|
| [`hacks/`](hacks/) | Modul-ZIPs (siehe [`hacks/SOURCES.md`](hacks/SOURCES.md)) |
| [`fonts/dompdf/`](fonts/dompdf/) | Noto Sans TTFs (siehe [`fonts/SOURCES.md`](fonts/SOURCES.md)) |
| [`theme-overlay/`](theme-overlay/) | `functions.php` + PDF-Font-CSS für dompdf |

ConfigMaps (`hack-cm-*.yaml`, `font-cm-*.yaml`, `theme-overlay-cm.yaml`) tragen die Binaries; der Job mountet sie und `kubectl cp`/`install-module` in den BookStack-Pod.

**Font-ConfigMaps** (~570 KiB TTFs): client-side `kubectl apply` scheitert an der `last-applied-configuration`-Annotation (>256 KiB). Stattdessen:

```bash
kubectl apply --server-side --force-conflicts -f font-cm-notosans.yaml -f font-cm-notosans-bold.yaml
```

Nach PVC-Wipe: Argo Sync (Job läuft erneut). Manuell: Job löschen und Application syncen, oder:

```bash
kubectl -n bookstack delete job bookstack-theme-modules-sync --ignore-not-found
# dann Argo Sync bzw. kubectl apply -f theme-modules-sync.yaml && wait
```

### Mermaid Viewer

Interaktive Diagramme ([Hack](https://www.bookstackapp.com/hacks/mermaid-viewer/)). Nutzung: Markdown ` ```mermaid ` … ` ``` ` oder WYSIWYG-Codeblock Sprache `mermaid`. CDN: cdnjs (Mermaid + Font Awesome). Kein PDF-Export-Rendering.

### Offline Web Export

Zusätzlicher Export **Offline Web ZIP** ([patattzel/bookstack-offline-web-export](https://github.com/patattzel/bookstack-offline-web-export)) — navigierbares HTML + Assets. Portable ZIP bleibt unverändert.

Routen: `/books/{slug}/export/offline-zip` (auch chapter/page). Menü: **Offline Web ZIP**.

### PDF export

- `EXPORT_PAGE_SIZE=a4` ([Doku](https://www.bookstackapp.com/docs/admin/pdf-rendering/#export-page-size))
- Engine: Standard **dompdf**
- Fonts: `NotoSans.ttf` / `NotoSans-Bold.ttf` → PVC `/config/www/fonts/dompdf/` + ephemeral `/app/www/storage/fonts/dompdf/` (PostSync Job; `postStart` im Deployment kopiert PVC→storage nach Restart)
- CSS (Theme-Root): `pdf-fonts-head.blade.php` + `functions.php` (`renderBefore` base-body-start)

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

**Auto-Import:** Workflow [BookStack import](../../.github/workflows/bookstack-import.yml) — siehe [`docs/bookstack/IMPORT.md`](../../docs/bookstack/IMPORT.md) § Automatischer Import (API-Token + GH Secrets `BOOKSTACK_*`).

### E-Mail bei Buch-Änderungen (Home Assistant)

1. **Live-Wiki:** Nutzer beobachten das Buch *Home Assistant* in BookStack (Watch) — SMTP muss stehen (`bookstack-smtp`, Rollenrecht „Receive notifications“).
2. **Git:** Workflow [`.github/workflows/notify-home-assistant-book.yml`](../../.github/workflows/notify-home-assistant-book.yml) mailt bei Push auf `main` unter `docs/bookstack/books/home-assistant/` (Empfänger [`recipients.yaml`](../../docs/bookstack/books/home-assistant/recipients.yaml), Secrets laut [`BENACHRICHTIGUNGEN.md`](../../docs/bookstack/books/home-assistant/BENACHRICHTIGUNGEN.md)).

## Theme-Module / „Plugins“

| Modul | Status | Nutzen |
|-------|--------|--------|
| [Mermaid Viewer](https://www.bookstackapp.com/hacks/mermaid-viewer/) | **GitOps** | Interaktive ` ```mermaid ` -Diagramme |
| [Offline Web Export](https://github.com/patattzel/bookstack-offline-web-export) | **GitOps** | Offline HTML-ZIP Export |
| `header-anchor-link` | Vorschlag | Anker-Links an Überschriften |
| `pdf-embed` | Vorschlag | PDFs in Seiten einbetten |
| `sticky-table-heads` | Vorschlag | Tabellenköpfe fixieren |

Weitere Module: ZIP nach `hacks/` + ConfigMap + Job-Schritt, oder einmalig `php artisan bookstack:install-module` (ADR-0017).
