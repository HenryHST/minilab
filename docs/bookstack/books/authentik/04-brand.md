---
title: Brand
book_version: "1.1.0"
---

# Brand

Die Brand heißt **Stadthagen Home**. OpenTofu setzt sie über [terraform/authentik/modules/brand](https://github.com/HenryHST/Infra_LAB/tree/main/terraform/authentik/modules/brand) und `authentik_brand.default` mit `default = true`. Die Domain kommt aus `authentik_url` (`idp.stadthagen.dev`).

## Texte und Farben

| | |
|--|--|
| `branding_title` | Willkommen Stadthagen Home |
| Produktname in Mails und Flow-Titeln | Stadthagen Home |
| Footer | © Henry Stadthagen |
| Akzent | `#2563eb` |
| Primary, Hover | `#1d4ed8` |
| Theme | `light` (`attributes.settings.theme.base`) |

Das CSS steht in `modules/brand/assets/custom.css.tpl`. Es setzt die Patternfly-Variablen auf diese Farben und blendet den festen Eintrag „Powered by authentik“ aus. In `environment = dev` zeigt `html::after` ein festes Badge **DEV**. Prod hat dieses Badge nicht. `body::before` bleibt frei, weil Authentik damit den Flow-Hintergrund zeichnet.

`authentik_system_settings` bleibt aus (`manage_system_settings = false`), solange der Provider das Feld `core_default_app_access` nicht lesen kann.

## Medien

| Datei im Modul | Pfad in Authentik |
|--|--|
| `assets/key_transparent.png` | `branding/key_transparent.png` (Logo) |
| `assets/favicon.png` | `branding/favicon.png` |
| `assets/website-work.svg` | `branding/website-work.svg` (Flow-Hintergrund) |

Die ausgelieferte Kopie liegt auf dem NAS unter `/var/nfs/shared/infra01/media/public/branding/`. PostSync-Job `authentik-media-sync-bootstrap` kopiert sie nach PVC `authentik-media`. CronJob `authentik-media-sync` wiederholt das alle 6 Stunden. Ein manuelles Job-Objekt heißt `media-sync-manual`.

Dieser Sync ist nicht das Backup. `authentik-backup-cron` archiviert Datenbank und das ganze Media-PVC.

## Flows an der Brand

| Flow | Slug |
|--|--|
| Authentication | Default-Flow des Providers |
| Invalidation | Default-Flow des Providers |
| Recovery | `passwort-zuruecksetzen` |
| Enrollment, vom Login verlinkt | `registrierung` |

Recovery-Mail-Betreff: `Passwort zurücksetzen – Stadthagen Home`. Einladung: `Einladung zur Registrierung – Stadthagen Home`. Registrierungs-Titel: `Konto bei Stadthagen Home anlegen`. Alle drei nutzen denselben Flow-Hintergrund.

Felder, die Authentik selbst pflegt (`flow_unenrollment`, `flow_user_settings`, `flow_device_code`, `default_application`, Zertifikate), ignoriert OpenTofu.
