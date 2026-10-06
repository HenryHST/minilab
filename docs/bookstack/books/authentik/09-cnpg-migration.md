---
title: CNPG Migration
book_version: "1.0.0"
---

# CNPG Migration

Authentik-Postgres läuft auf CloudNativePG Cluster `authentik-pg` (Service `authentik-pg-rw`). Der Bitnami-Subchart ist abgeschaltet. Vorlage und Ablauf: [Termix Migration](../termix/04-migration.md), ADR [0033](../../../adr/0033-authentik-cnpg.md).

## Zielwerte

| Platzhalter | Authentik |
|-------------|-----------|
| Namespace | `authentik` |
| Cluster / Service | `authentik-pg` → `authentik-pg-rw` |
| Image | `ghcr.io/cloudnative-pg/postgresql:17` |
| Volume | 8Gi, `longhorn` |
| Quelle (Import) | StatefulSet/Service `authentik-postgresql` |
| DB / User | `authentik` / `authentik` |
| Secret | `authentik-credentials` (`username`, `password`, `AUTHENTIK_POSTGRESQL__*`) |
| App-Host | `authentik.postgresql.host: authentik-pg-rw`, `SSLMODE=require` |

## Cutover (kurz)

1. PVC-Probe 8Gi + Vorab-`pg_dump` auf NFS.
2. Secret um `username`/`password` ergänzen.
3. server/worker auf 0 (Argo Self-Heal pausieren).
4. Cluster mit Import anwenden; Zeilenzahlen vergleichen (ohne `django_channels_*` / Cache).
5. Helm: `postgresql.enabled: false`, Host `authentik-pg-rw`; Backup/Restore `PGHOST`/`PGSSLMODE`.
6. Scale up; Login `https://idp.stadthagen.dev/`; Cutover-`pg_dump`.
7. Import-Block entfernen; Bitnami-STS löschen; PVC später entsorgen.

## Verify

```bash
kubectl -n authentik get cluster authentik-pg
kubectl -n authentik get secret authentik -o jsonpath='{.data.AUTHENTIK_POSTGRESQL__HOST}' | base64 -d; echo
curl -skI --resolve idp.stadthagen.dev:443:192.168.0.215 https://idp.stadthagen.dev/
```
