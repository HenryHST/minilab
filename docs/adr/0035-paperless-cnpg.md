# ADR-0035: Paperless-ngx Postgres auf CloudNativePG

- **Status:** Accepted
- **Datum:** 2026-10-08
- **Kontext:** `apps/dev/paperless/`, Folge von [ADR-0030](0030-cloudnative-pg.md)

## Kontext

Paperless-ngx nutzte StatefulSet `paperless-postgres` (Image `postgres:18`, hostPath `/var/lib/paperless-postgres` auf `nxk3-w01`). App und Worker zeigten auf `PAPERLESS_DBHOST=paperless-postgres`. Secret `paperless-db` hatte nur `POSTGRES_PASSWORD`. Termix und Authentik laufen bereits auf CloudNativePG mit Longhorn.

## Entscheidung

- Cluster **`paperless-pg`** im Namespace `paperless` (Name nicht `paperless`, damit der Cluster-ServiceAccount nicht mit der App kollidiert). Service `paperless-pg-rw`.
- Image `ghcr.io/cloudnative-pg/postgresql:18` (Quelle war PG18). 1 Instanz, 8Gi `longhorn`.
- Einmaliger Import `bootstrap.initdb.import.type: microservice` von Service `paperless-postgres` (`sslmode: disable`). Import-Block und `externalClusters` sind nach dem Cutover entfernt.
- Hybrid-TLS wie Authentik: Server-CA/TLS über cert-manager (`cnpg-certificates.yaml`), Client/Replication Operator-managed. App `PAPERLESS_DBSSLMODE=require`.
- Secret `paperless-db` (Infra_LAB): zusätzlich `username` (`paperless`) und `password` aus `PAPERLESS_DB_PASSWORD`. `POSTGRES_PASSWORD` bleibt für die App.
- Backup: `ScheduledBackup` `paperless-pg-snapshot` (Longhorn VolumeSnapshot, online) plus `pg_dump` gegen `paperless-pg-rw` mit `PGSSLMODE=require`.
- StatefulSet und Service `paperless-postgres` sind aus Git entfernt. hostPath `/var/lib/paperless-postgres` auf `nxk3-w01` bleibt als Rollback liegen.

## Konsequenzen

- n8n-Postgres ist nicht umgestellt.
- `verify-full` / CA-Mount in Paperless bleibt offen.
- Eine Instanz. Kein sofortiges Löschen des hostPath.
