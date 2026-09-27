# ADR-0026: Paperless-ngx mit Redis in infra

- **Status:** Accepted
- **Datum:** 2026-09-27
- **Kontext:** `apps/dev/paperless/`, `apps/infra/redis/`, Issue [HenryHST/minilab#64](https://github.com/HenryHST/minilab/issues/64)

## Kontext

Dokumentenarchiv mit OCR, HPScan-Import und Authentik-Login soll auf nXk3 laufen (Fresh-Start, keine pi1cl-Migration). Redis soll wiederverwendbar als eigene Infra-App liegen.

## Entscheidung

- **Storage:** hostPath/local PVs on `nxk3-w01` for Postgres/data/media/export (Longhorn derzeit ohne freie Disk — gleiches Muster wie Termix); HPScan consume weiterhin NFS.
- **Consume:** NFS PV von un10 HPScan-Export; Tag `inbox` via PostSync-Job.
- **Auth:** Authentik OIDC (LAN + Ext-Redirects wie Termix); SMTP `mail.henrystadthagen.de:465`.
- **Exposure:** LAN `paperless.stadthagen.dev`; Ext `paperless-ext` in pangolin-publish mit **`enabled: false`** vorbereitet.
- **Backup:** ADR-0015 CronJob (`pg_dump` + data/media tar → NFS).

```mermaid
flowchart LR
  HPScan[un10 HPScan NFS] -->|consume| Web[paperless web]
  Web --> PG[(postgres 18)]
  Web --> Redis[redis infra]
  Worker[paperless-worker HPA] --> PG
  Worker --> Redis
  Traefik --> Web
  Auth[Authentik] --> Web
  Pangolin[paperless-ext disabled] -.-> Web
```

## Konsequenzen

- Secrets müssen vor Sync gesetzt sein (`PAPERLESS_*` + OAuth pin in Terraform).
- un10 NFS-ACL muss k3s-Nodes erlauben.
- Ext-Traffic erst nach Flip von `enabled: true` in pangolin-publish.
