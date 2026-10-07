# ADR-0033: Authentik Postgres auf CloudNativePG

- **Status:** Accepted
- **Datum:** 2026-10-06
- **Kontext:** `apps/ops/authentik/`, Companion Infra_LAB ADR-0024

## Kontext

Authentik (IdP) lief mit dem Bitnami-PostgreSQL-Subchart (`postgresql.enabled: true`, Longhorn 8Gi, Service `authentik-postgresql`). Der CNPG-Operator steht bereits ([ADR-0030](0030-cloudnative-pg.md)); Termix war der Pilot-Import.

## Entscheidung

- Cluster **`authentik-pg`** im Namespace `authentik` (nicht `authentik`, um SA-Namenskollisionen zu vermeiden).
- Image `ghcr.io/cloudnative-pg/postgresql:17`, 1 Instanz, 8Gi `longhorn`.
- Einmaliger Import `bootstrap.initdb.import.type: microservice` von `authentik-postgresql` (`sslmode: disable`), danach Import-Block entfernt.
- App: `postgresql.enabled: false`, `authentik.postgresql.host: authentik-pg-rw`, Secret-Key `AUTHENTIK_POSTGRESQL__SSLMODE=require`.
- Secret `authentik-credentials`: zusätzlich `username` / `password` für CNPG (gleicher Wert wie `AUTHENTIK_PG_PASSWORD`).
- **Hybrid-TLS (Pilot):** Server-CA + Server-TLS über cert-manager im Namespace `authentik` (`cnpg-certificates.yaml` → Secret `authentik-pg-server-tls`, Label `cnpg.io/reload`). Cluster setzt `certificates.serverCASecret` / `serverTLSSecret`. Client/streaming_replica bleiben Operator-managed. App bleibt vorerst bei `sslmode=require` (kein CA-Mount).
- Backup: `ScheduledBackup` VolumeSnapshot + bestehender `pg_dump`-CronJob auf `authentik-pg-rw` / NFS.
- Bitnami-StatefulSet entfernt; PVC `data-authentik-postgresql-0` bleibt vorerst als Rollback-Kopie Bound.

## Konsequenzen

- IdP-Cutover braucht ein kurzes Wartungsfenster (server/worker auf 0).
- Argo ApplicationSet kann `syncPolicy.automated` zurücksetzen — während des Imports Self-Heal pausieren oder Replicas manuell halten.
- Nächste Apps (n8n, paperless) können dieselbe Vorlage nutzen ([Termix Migration](../bookstack/books/termix/04-migration.md), [Authentik CNPG](../bookstack/books/authentik/09-cnpg-migration.md)).
- **Folge:** optional `verify-full` mit CA-Mount (`AUTHENTIK_POSTGRESQL__SSLROOTCERT=file:///certs/ca.crt`) und Companion-SecretSpec. Termix nutzt dasselbe Hybrid-Muster (`apps/dev/termix/cnpg-certificates.yaml`).
