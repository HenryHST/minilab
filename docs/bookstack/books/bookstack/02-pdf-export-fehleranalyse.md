---
title: PDF-Export Fehleranalyse
book_version: "1.0.0"
---


# PDF-Export Fehleranalyse

> **Buch** v1.0.0 · Stand: 2026-10-17 · Incident 2026-10-17

Fehleranalyse und Fix für **UI-PDF-Export** (dompdf) auf bilderreichen Seiten (z. B. Home Assistant → Dashboard Home). CLI-Export und API-Export dienten als Vergleich; der Browser-Pfad läuft über **PHP-FPM**, nicht über CLI.

## Symptome

| Symptom | Typische Meldung / Beobachtung |
|--|--|
| Export bricht ab | Weiße/Fehlerseite nach ~30 s; nginx/PHP Fatal |
| Log (älter / parallel) | `Allowed memory size of 134217728 bytes exhausted` in `dompdf/.../Cpdf.php` |
| Log | `Maximum execution time of 30 seconds exceeded` in `Cpdf.php` |
| Log / UI | `Failed to create required font data in …/storage/fonts/dompdf` |
| UI | **Keine Zugriffsberechtigung auf diese Seite** trotz sichtbarer Seite |
| Früherer Stack (Cron) | `Please provide a valid cache path` / `laravel.log` append — **nicht** UI-PDF, sondern Artisan ohne `/config`-PVC |

Schwere Seite (Dashboard Home): CLI ~15 MB PDF, ~47–53 s, Peak ~140–190 M.

## Fehleranalyse (2026-10-17)

Mehrere unabhängige Ursachen stapelten sich. Jede musste separat bestätigt und behoben werden.

### 1. FPM memory_limit 128 M (OOM)

| Hypothese | Ergebnis | Evidenz |
|--|--|--|
| CLI und UI teilen dieselbe PHP-INI | **verworfen** | CLI: `php-local.ini` via `PHP_INI_SCAN_DIR=/config/php` → `memory_limit=512M`. FPM: `include=/config/php/*.conf` — **lädt keine `.ini`** |
| UI-OOM bei 128 M | **bestätigt** | `laravel.log`: `Allowed memory size of 134217728 bytes exhausted` in `Cpdf.php` (PNG-Decode) |
| Fix: `www2.conf` | **bestätigt** | `php_admin_value[memory_limit] = 512M`; Probe `fpm_memory_limit=512M` |

### 2. FPM max_execution_time 30 s

| Hypothese | Ergebnis | Evidenz |
|--|--|--|
| Memory allein reicht | **verworfen** | Nach 512 M: `Maximum execution time of 30 seconds exceeded` (~36 s Request) |
| CLI unbegrenzt, FPM 30 s | **bestätigt** | CLI `max_execution_time=0`; FPM aus `/etc/php85/php.ini` = 30; Dashboard Home braucht ~47 s |
| USR2 reicht zum Reload | **verworfen** | Nach `kill -USR2` blieben Worker mit `max_execution_time=30`. **Hard-Restart** (`s6-svc -r` / TERM master) → `300` |
| Traefik killt lange PDFs | **verworfen** | `https://book-ext…/api/pages/264/export/pdf` → **HTTP 200**, 15 MB, ~52 s |

Zusätzlich: nginx `fastcgi_read_timeout` / `fastcgi_send_timeout` **300s** in `site-confs/default.conf` (sonst greift ggf. der Default vor PHP).

### 3. Dompdf-Fonts root-owned (FPM = `abc`)

| Hypothese | Ergebnis | Evidenz |
|--|--|--|
| Nur Memory/Timeout | unvollständig | FPM-Probe: `Failed to create required font data in /app/www/storage/fonts/dompdf` bei Limit 512 M |
| Verzeichnis nicht beschreibbar | **teilweise** | Dir war für `abc` writable; aber `*.ufm` / `installed-fonts.json` **root:root** `0644` nach CLI-`artisan`/Probe als root |
| `setFontFamily` braucht Schreibrecht auf Metrics | **bestätigt** | Nach `chown -R abc:abc` → `setFontFamily_ok`; danach FPM-PDF `fpm_ok` |

PostSync [`theme-modules-sync.yaml`](../../../../apps/dev/bookstack/theme-modules-sync.yaml) synct TTFs und chownt den Font-Pfad; root-eigene Metrics nach CLI-Tests erneut chownen bzw. löschen lassen.

### 4. Rolle ohne `content-export`

| Hypothese | Ergebnis | Evidenz |
|--|--|--|
| Seite nicht sichtbar → kein Export | **verworfen** | User konnte `/books/…/dashboard-home` mit **200** lesen |
| Direkte Export-URL ohne Session | **Nebenbefund** | Unauth `GET …/export/pdf` → **302** → `/login` (kein ACL-Text) |
| Rolle **BookStack Familie** ohne Export-Recht | **bestätigt** | User `h.stadthagen@me.com` nur Rolle Familie; `content-export` fehlte (Admin/Editor/Viewer/Public hatten es). UI: **Keine Zugriffsberechtigung** |

`page-view-all` ≠ Export. UI-Export braucht die System-Permission **`content-export`**.

### 5. Abgrenzung: Cache-Path / laravel.log (Cron)

Separates Thema: Helm-`shelfPermissionsCron` bzw. Job **ohne** gemountetes `/config` → Artisan sieht keinen gültigen Cache-/Log-Pfad. Fix: [`copy-shelf-permissions-cronjob.yaml`](../../../../apps/dev/bookstack/copy-shelf-permissions-cronjob.yaml) (`kubectl exec` in den App-Pod; PVC ist RWO → kein zweites Volume-Mount).

## Fix (GitOps / Live)

| Maßnahme | Wo |
|--|--|
| `memory_limit=512M` + `max_execution_time=300` in `php-local.ini` (CLI) und `www2.conf` `php_admin_value[...]` (FPM) | PVC `/config/php/`; idempotent in PostSync `theme-modules-sync` |
| FPM **hard restart** nach INI-Änderung (nicht nur USR2) | PostSync / manuell `s6-svc -r /run/service/svc-php-fpm` |
| nginx FastCGI-Timeouts 300 s | `/config/nginx/site-confs/default.conf` (PostSync) |
| Font-Dir `chown -R abc:abc`, Metrics nicht root-owned | PostSync + nach CLI-PDF-Tests |
| `content-export` in Rolle **BookStack Familie** | Live + Bootstrap in `docs-import-configmap.yaml` (`$familiePermissions`) |

App-README-Kurzreferenz: [`apps/dev/bookstack/README.md`](../../../../apps/dev/bookstack/README.md) → Abschnitt PDF export.

## Soll-Zustand / Verify

```text
Browser  --HTTPS-->  Traefik / Pangolin
                         |
                         v
                    nginx → php-fpm (abc)
                         memory_limit=512M
                         max_execution_time=300
                         fonts/dompdf writable by abc
                         |
                         v
                    dompdf → PDF Download
```

Schnellchecks (im App-Pod):

```bash
# FPM-Limits (kurzlebige Probe-Datei, danach löschen)
printf '<?php header("Content-Type: text/plain"); echo "mem=".ini_get("memory_limit")." exec=".ini_get("max_execution_time")."\n";' \
  > /app/www/public/_t.php && chown abc:abc /app/www/public/_t.php
curl -sS http://127.0.0.1/_t.php   # erwartet: mem=512M exec=300
rm -f /app/www/public/_t.php

ls -la /app/www/storage/fonts/dompdf   # Owner abc, .ufm/.json schreibbar
```

UI: eingeloggt Seite öffnen → **Export → PDF** (nicht nur URL ohne Session paste’n). Erwartung: Download nach ~1 Min. bei schweren Seiten.

API (Admin-Token): `GET /api/pages/{id}/export/pdf` → `200`, Magic `%PDF-`.

## Runbook bei Regression

1. `laravel.log` / nginx error: OOM vs. `max_execution_time` vs. Font-Pfad vs. 403/ACL.
2. FPM-Limits prüfen; bei Bedarf `www2.conf` + **hard** FPM-Restart.
3. Font-Ownership: `chown -R abc:abc /app/www/storage/fonts/dompdf`.
4. Rolle des Users: Settings → Roles → **content-export** gesetzt?
5. Access-Log: kam überhaupt `…/export/pdf` vom Browser an (nicht nur Seitenviews)?
