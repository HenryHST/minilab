---
title: Architektur
book_version: "1.0.0"
---

# Architektur

## App

- Deployment `termix`, `replicaCount: 2`, Anti-Affinity über `kubernetes.io/hostname`.
- Container `termix` und `guacd`. `GUACD_TUNNEL_HOST=127.0.0.1`.
- Kein eigenes PVC. Session-Daten und Hosts liegen in Postgres.
- IngressRoute `termix.stadthagen.dev`, TLS-Secret `termix-tls`.
- ServiceAccount `termix`: Token-Automount an, die App-Pods setzen `automountServiceAccountToken: false`. CloudNativePG braucht das Token, weil der Cluster denselben Namen trägt.

## Postgres

| | |
|--|--|
| Cluster | `termix` |
| Image | `ghcr.io/cloudnative-pg/postgresql:16` |
| Instanzen | 1 |
| Storage | 1Gi, StorageClass `longhorn` |
| Services | `termix-rw`, `termix-ro`, `termix-r` |
| PodMonitor | `monitoring.enablePodMonitor: true` |

Die App liest nur `DATABASE_URL` aus Secret `termix-ha`.

## Secrets

| Secret | Keys | Quelle |
|--------|------|--------|
| `termix-db` | `username` = `termix`, `password`, `POSTGRES_PASSWORD` | `TERMIX_OAUTH_CLIENT_SECRET` |
| `termix-ha` | `DATABASE_URL`, JWT- und Encryption-Keys | dasselbe Passwort plus `TERMIX_HA_CRYPTO_HEX` |
| `termix-oauth` | `client-secret` | OIDC-Client |

`DATABASE_URL`:

```text
postgresql://termix:{password}@termix-rw.termix.svc.cluster.local:5432/termix?sslmode=require&uselibpqcompat=true
```

`sslmode=require` erzwingt TLS. Node-`pg` behandelt `require` sonst als Zertifikatsprüfung und scheitert an der Operator-CA. `uselibpqcompat=true` lässt die Verschlüsselung zu, ohne die CA zu prüfen.

## Backup

CronJob `termix-backup-cron`, 03:00 UTC, Image `postgres:16-alpine`.

- `PGHOST=termix-rw`
- `PGSSLMODE=require`
- Ziel: PVC `termix-backups` (NFS `192.168.0.25:/var/nfs/shared/infra01/termix-backups`)
- Restore-Job `termix-bootstrap-restore` nutzt dieselben Variablen und läuft nur, wenn ConfigMap `termix-restore` `enabled=true` setzt.

## Operator

Der Operator in `cnpg-system` muss die Instanz auf HTTPS `:8000` erreichen. Die NetworkPolicy `cloudnative-pg-instance-status` erlaubt genau diesen Egress. Ohne ihn bleibt der Cluster auf `Instance Status Extraction Error`.
