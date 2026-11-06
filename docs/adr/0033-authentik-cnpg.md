# ADR-0033: Authentik Postgres auf CloudNativePG

- **Status:** Accepted (amended 2026-11-06)
- **Datum:** 2026-10-06
- **Kontext:** `apps/ops/authentik/`, Companion Infra_LAB ADR-0024

## Kontext

Authentik (IdP) lief mit dem Bitnami-PostgreSQL-Subchart (`postgresql.enabled: true`, Longhorn 8Gi, Service `authentik-postgresql`). Der CNPG-Operator steht bereits ([ADR-0030](0030-cloudnative-pg.md)); Termix war der Pilot-Import.

## Entscheidung

- Cluster **`authentik-pg`** im Namespace `authentik`.
- Image `ghcr.io/cloudnative-pg/postgresql:17…-standard-bookworm`.
- **Live (2026-11):** `instances: 2`, PVC **48Gi** `longhorn` (nach WAL-Incidents 2026-10-25 / 2026-11-01 expandiert; ursprünglich 1×/8Gi beim Cutover).
- Einmaliger Import `bootstrap.initdb.import.type: microservice` von `authentik-postgresql` (`sslmode: disable`), danach Import-Block entfernt.
- App: `postgresql.enabled: false`, `authentik.postgresql.host: authentik-pg-rw`, Secret-Key `AUTHENTIK_POSTGRESQL__SSLMODE=require`.
- Secret `authentik-credentials`: zusätzlich `username` / `password` für CNPG (gleicher Wert wie `AUTHENTIK_PG_PASSWORD`).
- **Hybrid-TLS:** Server-CA + Server-TLS über cert-manager (`cnpg-certificates.yaml` → Secret `authentik-pg-server-tls`). Client/streaming_replica bleiben Operator-managed. App bei `sslmode=require`.
- **Backup:** VolumeSnapshot (`retentionPolicy: 7d`) + online `pg_dump`; **WAL/PITR** via Barman Cloud Plugin → RustFS ObjectStore `authentik-pg-wal` (kein in-tree `barmanObjectStore` auf `standard-bookworm`).
- **HA:** `enablePodAntiAffinity` + `nodeSelector.worker=true`; mind. `instances+1` Worker.
- **Probes (Perun #05):** `spec.probes.liveness` mit längerer Toleranz; `checkpoint_completion_target: "0.9"`.
- Bitnami-StatefulSet entfernt; PVC `data-authentik-postgresql-0` war Rollback-Kopie.

## Konsequenzen

- IdP hängt an ContinuousArchiving (Plugin :9090 / ObjectStore); siehe Incidents 2026-11-01 / 2026-11-04.
- BookStack: minilab [Production Failure Patterns](../bookstack/books/cloudnative-pg/06-production-failure-patterns.md); Infra_LAB K3s Ops-Runbook + Authentik Ausfallsicherheit.
- Weitere Apps nutzen dieselbe Vorlage ohne WAL/ObjectStore, bis PITR explizit nötig ist.
