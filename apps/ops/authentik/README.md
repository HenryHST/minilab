# Authentik (nXk3 IdP)

GitOps install for `idp.stadthagen.dev`. Day-0 blueprints: [BLUEPRINTS.md](BLUEPRINTS.md).

## Scheduling / HA

- **Hard** `nodeSelector` / `nodeAffinity`: `worker=true` (Proxmox only). **No** Pi fallback (RWO Longhorn attach wars — BookStack incident 2026-10-14).
- Do **not** label Pis with `worker=true` (Traefik / Longhorn-disk stay Proxmox-only).
- server: Chart **HPA** min 2 / max 5 (CPU 75%, scaleDown stabilization 300s); worker **replicas: 2** (fixed). `RollingUpdate`, PDB `minAvailable: 1` (`pdb.yaml`). Media PVC is **RWX**.
- CNPG **`instances: 2`** + continuous WAL to RustFS; dedicated Redis StatefulSet **2** (primary+replica).
- Runtime/HA narrative: Infra_LAB BookStack **Authentik Runtime** + `docs/diagrams/authentik/authentik-{scheduling,fail-domains,failover}.html`.
- Upstream HPA: https://docs.goauthentik.io/sys-mgmt/ops/autoscaling/hpa/

```bash
kubectl -n authentik get deploy,pods,pdb,hpa,sts -o wide
kubectl -n authentik get deploy authentik-server -o yaml | grep -A25 affinity
```

## Database (CloudNativePG)

Postgres is Cluster `authentik-pg` (Service `authentik-pg-rw`, PG17, Longhorn 8Gi, **2 instances**, anti-affinity). Helm subchart is off (`postgresql.enabled: false`).

| Backup path | Detail |
|-------------|--------|
| VolumeSnapshot | `ScheduledBackup authentik-pg-snapshot` every 6h |
| WAL + barman base | `barmanObjectStore` → RustFS `s3://authentik-pg-wal/` (PreSync Job creates bucket); daily `authentik-pg-barman` |
| Portable archive | Online `pg_dump` CronJob → NFS + `s3://authentik-backups/` |

Cutover notes: [09-cnpg-migration](../../docs/bookstack/books/authentik/09-cnpg-migration.md), [ADR-0033](../../docs/adr/0033-authentik-cnpg.md).

### TLS (Hybrid)

Server CA/TLS comes from cert-manager (`cnpg-certificates.yaml` → Secret `authentik-pg-server-tls`). Client/replication stay operator-managed (`authentik-pg-ca`, `authentik-pg-replication`). App uses `AUTHENTIK_POSTGRESQL__SSLMODE=require` (no CA mount yet).

```bash
kubectl -n authentik get certificate authentik-pg-server
kubectl -n authentik get cluster authentik-pg -o jsonpath='{.status.instances} ready={.status.readyInstances}{"\n"}'
```

**Follow-up (not in pilot):** (1) mount CA + `verify-full` / `SSLROOTCERT=file:///certs/ca.crt` and update Infra_LAB SecretSpec; (2) same hybrid pattern for Termix (`apps/dev/termix/`).

## Redis

Authentik **requires** Redis for cache, sessions, and the task broker.

| Piece | Value |
|-------|--------|
| Dedicated STS | `redis.yaml` → Service `authentik-redis.authentik.svc.cluster.local:6379` (primary `…-0`) |
| Replicas | 2 (primary + replicaof), PDB `minAvailable: 1`, Longhorn RWO PVCs |
| Config | `values.yaml` → `authentik.redis.host` → Secret key `AUTHENTIK_REDIS__HOST` |
| Shared Redis | `apps/infra/redis` remains for **paperless** (and others); Authentik no longer depends on it |

Verify:

```bash
kubectl -n authentik get sts,pods,svc -l app.kubernetes.io/component=redis
kubectl -n authentik get secret authentik -o jsonpath='{.data.AUTHENTIK_REDIS__HOST}' | base64 -d; echo
kubectl -n authentik run redis-probe --rm -i --restart=Never --image=busybox:1.36 \
  --command -- nc -zvw3 authentik-redis.authentik.svc.cluster.local 6379
```

After changing `values.yaml`, re-render `helm-manifest.yaml` (see Helm below) and sync Application `authentik`.

## Brand media (logos / background)

NFS source: `192.168.0.25:/var/nfs/shared/infra01/media/public/branding/` → PVC `authentik-media` at `/media/public/branding/`.

- **PostSync Job** `authentik-media-sync-bootstrap` — runs once after each successful Argo sync.
- **CronJob** `authentik-media-sync` — every 6h thereafter.

Live `/media` is Longhorn **RWX**. If mounts fail with *Waiting for volume share*: check Instance Manager CPU on the share owner (Longhorn `im-cpu-enforcer`, BookStack incident 2026-10-21).

Manual: `kubectl -n authentik create job --from=cronjob/authentik-media-sync media-sync-manual`

## Backup / Restore

Upstream: [Backup and restore](https://docs.goauthentik.io/sys-mgmt/ops/backup-restore/).

| Upstream | Lab | In archive? |
|----------|-----|-------------|
| PostgreSQL (users, flows, **TOTP/WebAuthn**) | CNPG `authentik-pg` / online `pg_dump` | Yes — `db.sql.gz` |
| `/data` (icons, uploads) | PVC `authentik-media` → `/media` | Yes — `media.tar.gz` |
| `/certs`, `/custom-templates`, `/blueprints` | N/A or GitOps ConfigMap | No |

### Schedule (Europe/Berlin, **online** — IdP stays up)

| CronJob | Schedule | Downtime |
|---------|----------|----------|
| `authentik-backup-0230` | `30 2 * * *` | none (online dump + media tar) |
| `authentik-backup-1150` | `50 11 * * *` | none |

Each run: `pg_dump` + media PVC mount → combined `authentik-YYYYMMDD-HHMMSS.tar.gz` to:

| Target | Details |
|--------|---------|
| **NFS** | PVC `authentik-backups` → `192.168.0.25:…/authentik-backups` |
| **S3** | RustFS pi7cl, bucket `authentik-backups`, Secret `authentik-backup-s3` |

Retention **30 days** per target. Job fails if either upload fails.

```bash
mkdir -p /var/nfs/shared/infra01/authentik-backups   # NAS once
kubectl -n authentik create job --from=cronjob/authentik-backup-0230 authentik-backup-manual
kubectl -n authentik logs -f job/authentik-backup-manual -c backup
```

See [VERIFY.md](VERIFY.md). MFA row restore: [scripts/restore-user-mfa.sh](scripts/restore-user-mfa.sh).

## Helm (vendored + rendered)

```bash
helm pull authentik --repo https://charts.goauthentik.io --version 2026.8.5 --untar --untardir charts
helm dependency update charts/authentik
helm template authentik ./charts/authentik \
  -f values.yaml --namespace authentik --include-crds \
  > helm-manifest.yaml
```

IdP config (OAuth/LDAP/Brand) stays in Infra_LAB OpenTofu / `--tags authentik-bootstrap`.

## Bootstrap-Admin (Anmelde-Passwort)

```bash
cd ansible/playbooks/k3s_cluster/secrets   # Infra_LAB
secretspec get AUTHENTIK_BOOTSTRAP_PASSWORD --profile cluster
kubectl -n authentik get secret authentik-credentials \
  -o jsonpath='{.data.AUTHENTIK_BOOTSTRAP_PASSWORD}' | base64 -d; echo
```
