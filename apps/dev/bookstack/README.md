# BookStack

Wiki / Wissensdatenbank:

| Access | URL |
|--------|-----|
| LAN | `https://book.stadthagen.dev` (Traefik) |
| Internet | `https://book-ext.stadthagen.dev` (Pangolin → Newt → ClusterIP) |

`APP_URL` is the public host (`book-ext`) so OIDC callbacks work from the internet. `SESSION_DOMAIN=.stadthagen.dev` shares the session/CSRF cookie across LAN `book` and `book-ext` (otherwise LAN `/login` POSTs to `book-ext` and Laravel returns **419 Page Expired**). Argo applies **`helm-manifest.yaml`** (regenerate after values changes: `helm template bookstack ./charts/bookstack -f values.yaml --namespace bookstack > helm-manifest.yaml`). Authentik also allows LAN redirects (`bookstack_url` + `bookstack_external_url`).

## Überblick

| Komponente | Details |
|------------|---------|
| Chart | [gabe565/bookstack](https://charts.gabe565.com/charts/bookstack/) (vendored) → committed `helm-manifest.yaml` |
| Image | `lscr.io/linuxserver/bookstack:version-v26.05.5` |
| DB | MariaDB 11.4 (`mariadb.yaml`, hostPath `/var/lib/bookstack-mariadb` @ `nxk3-w01`) |
| Auth | Authentik OIDC (`AUTH_METHOD=oidc`, `AUTH_AUTO_INITIATE=false`) |
| Theme | `APP_THEME=custom` — Modules/Fonts via Argo PostSync Job |
| PDF | `EXPORT_PAGE_SIZE=a4`, dompdf + Noto Sans; FPM `memory_limit=512M` + `max_execution_time=300` via `www2.conf`; font dir `abc`-writable |
| Comments | **Disabled** globally (`app-disable-comments=true` via docs-import `gitops-bootstrap.php`; no `.env`) |
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
| `bookstack-import` | `BOOKSTACK_TOKEN_ID` / `BOOKSTACK_TOKEN_SECRET` — SecretSpec `BOOKSTACK_API_TOKEN_*` (docs-import; Job legt User/Rolle/Token an) |

## Authentik

1. Application + OAuth2/OIDC Provider, Slug `bookstack`
2. Redirect URI (strict): `https://book-ext.stadthagen.dev/oidc/callback` (primary via `APP_URL`) plus LAN `https://book.stadthagen.dev/oidc/callback`
3. Post-Logout / login URIs on both hosts (`bookstack_url` + `bookstack_external_url`)
4. Gruppen (Namen = BookStack-Rollen): `BookStack Admin` / `BookStack Editor` / `BookStack Familie` (OIDC `groups` claim; Bootstrap legt die Rollen an)
5. Client-Secret → SecretSpec `bookstack-oauth`

Siehe [Authentik ↔ BookStack](https://integrations.goauthentik.io/documentation/bookstack/). Pangolin publish: `apps/ops/pangolin-publish` (niceId `book-ext`).

Login-Incidents (State-Race, `external_auth_id` nach Authentik-Restore, 419/`SESSION_DOMAIN`): Buch **BookStack** → Kapitel [OIDC-Login Fehleranalyse](../../../docs/bookstack/books/bookstack/03-oidc-login-fehleranalyse.md).

### OIDC Relink nach Authentik-Restore

ConfigMap `bookstack-oidc-relink` (`enabled` / `dry_run`) + PostSync-Job [`oidc-relink.yaml`](oidc-relink.yaml). Authentik-Exec-RBAC: [`../../ops/authentik/bookstack-oidc-relink-rbac.yaml`](../../ops/authentik/bookstack-oidc-relink-rbac.yaml).

Nach IdP-Restore: `enabled=true` + `dry_run=true` → Sync/Logs → bei `DRIFT` `dry_run=false` → Sync → `enabled=false`.

## Theme modules & PDF fonts (GitOps)

Argo **PostSync**-Job [`theme-modules-sync.yaml`](theme-modules-sync.yaml) installiert fehlende Module und synct Fonts/Theme-Overlay. Artefakte liegen im Repo:

| Pfad | Inhalt |
|------|--------|
| [`hacks/`](hacks/) | Modul-ZIPs (siehe [`hacks/SOURCES.md`](hacks/SOURCES.md)) |
| [`fonts/dompdf/`](fonts/dompdf/) | Noto TTFs — nur `NotoSans.ttf` / `NotoSans-Bold.ttf` als ConfigMap (siehe [`fonts/SOURCES.md`](fonts/SOURCES.md)) |
| [`theme-overlay/`](theme-overlay/) | `functions.php` + PDF-Font-CSS für dompdf |

ConfigMaps (`hack-cm-*.yaml`, `font-cm-notosans*.yaml`, `theme-overlay-cm.yaml`) tragen die Binaries; der Job mountet sie und `kubectl cp`/`install-module` in den BookStack-Pod.

**ArgoCD-Limit:** Zusätzliche Font-ConfigMaps sprengen `max combined manifest file size` (~10 MiB). Deshalb nur die zwei hinted Sans-CMs im App-Pfad; weitere TTFs bleiben Source-only unter `fonts/dompdf/`.

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

Fehleranalyse (Incident 2026-10-17, Hypothesen/Evidenz/Verify): BookStack-Buch [`docs/bookstack/books/bookstack/02-pdf-export-fehleranalyse.md`](../../docs/bookstack/books/bookstack/02-pdf-export-fehleranalyse.md).

- `EXPORT_PAGE_SIZE=a4` ([Doku](https://www.bookstackapp.com/docs/admin/pdf-rendering/#export-page-size))
- Engine: Standard **dompdf**
- PHP `memory_limit=512M` + `max_execution_time=300`: CLI via `/config/php/php-local.ini`; **FPM/UI** via `/config/php/www2.conf` `php_admin_value[...]` (FPM does not load `php-local.ini`; heavy pages need >30s). Nach INI-Änderung FPM **hard** restarten (USR2 kann alte Worker behalten)
- nginx `fastcgi_read_timeout`/`fastcgi_send_timeout` 300s in `site-confs/default.conf` (kept in sync by PostSync)
- Shelf-Permissions: CronJob [`copy-shelf-permissions-cronjob.yaml`](copy-shelf-permissions-cronjob.yaml) (`kubectl exec` into the app pod — Helm `shelfPermissionsCron` is off because the config PVC is RWO)
- Fonts: hinted `NotoSans.ttf` / `NotoSans-Bold.ttf` → PVC `/config/www/fonts/dompdf/` + ephemeral `/app/www/storage/fonts/dompdf/` (PostSync Job). **Must be writable by `abc`** (`.ufm` + `installed-fonts.json`); root-owned metrics from CLI `artisan` PDF break UI export until `chown -R abc:abc` that dir
- Rollen: UI-Export braucht System-Permission **`content-export`** (Rolle **BookStack Familie** enthält sie seit Bootstrap/`docs-import-configmap.yaml`)
- CSS (Theme-Root): `pdf-fonts-head.blade.php` + `functions.php` (`renderBefore` base-body-start) — Sans für Fließtext; `code`/`pre` mit Mono-Stack (Fallback DejaVu, bis Mono separat geliefert wird)

## Helm neu rendern

```bash
helm template bookstack ./charts/bookstack -f values.yaml --namespace bookstack > helm-manifest.yaml
```

## Backup / Restore

- NAS-Ordner: `mkdir -p /var/nfs/shared/infra01/bookstack-backups`
- Manuelles Backup: `kubectl -n bookstack create job --from=cronjob/bookstack-backup-cron bookstack-backup-manual`
- Bootstrap-Restore: ConfigMap `bookstack-restore` → `enabled=true` (bei vorhandener DB zusätzlich `force=true`), Argo Sync; danach sofort `enabled=false` committen

## Docs-Import (Git → BookStack)

Strukturierte Bücher & Checkliste: [`docs/bookstack/`](../../docs/bookstack/). **Kein GitHub Actions** — Sync nur im Cluster.

| Manifest | Zweck |
|----------|--------|
| [`docs-import-configmap.yaml`](docs-import-configmap.yaml) | Sources (`infra-lab-platform`, `minilab-docs`, …), Runner, Importer, `gitops-bootstrap` |
| [`docs-import-cronjob.yaml`](docs-import-cronjob.yaml) | SA/RBAC, State-CM, CronJob (alle 6 h), PostSync-Job |

**Voraussetzung:** Infra_LAB SecretSpec `BOOKSTACK_API_TOKEN_ID` / `BOOKSTACK_API_TOKEN_SECRET` → `--tags secrets` → Secret `bookstack-import`. Beim Lauf: Upsert Rolle **GitOps Import** (+ Content-ACL-Rechte), Rolle **BookStack Familie**, User `gitops-import@localhost`, Token `docs-import`, danach Markdown-Import (nested books, Shelf-Cover, Familie-ACL; SemVer-Gate in CM `bookstack-import-state`). `shelfPermissionsCron` kopiert Regal-Rechte auf Kind-Bücher.

```bash
# manuell
kubectl -n bookstack create job --from=cronjob/bookstack-docs-import docs-import-manual
kubectl -n bookstack logs -f job/docs-import-manual
```

Ohne Secret: Job skippt mit Exit 0. Details: [`docs/bookstack/IMPORT.md`](../../docs/bookstack/IMPORT.md) und Infra_LAB [`IMPORT.md`](https://github.com/HenryHST/Infra_LAB/blob/main/docs/bookstack/IMPORT.md).

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
