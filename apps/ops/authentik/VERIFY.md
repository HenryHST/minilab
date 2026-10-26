# Authentik backup / restore — verification checklist

Upstream: https://docs.goauthentik.io/sys-mgmt/ops/backup-restore/

## Prerequisites

- Secret `authentik/authentik-backup-s3` present (Infra_LAB `k3s_secrets` + RustFS keys)
- Bucket `authentik-backups` on pi7cl (`ansible-playbook site.yaml --tags rustfs --limit pi7cl`)
- Bucket `authentik-pg-wal` (PreSync Job `authentik-pg-wal-bucket` or manual `aws s3 mb`)
- NFS dir `…/authentik-backups` exists
- CronJobs synced: `authentik-backup-0230`, `authentik-backup-1150`
- CNPG `instances: 2`, Valkey STS `authentik-redis` Ready (`valkey/valkey:9.1.2-alpine`)

## Manual backup smoke (online — IdP stays up)

```bash
kubectl -n authentik create job --from=cronjob/authentik-backup-0230 authentik-backup-manual
kubectl -n authentik logs -f job/authentik-backup-manual -c backup
# In parallel: curl -sk -o /dev/null -w '%{http_code}\n' https://idp.stadthagen.dev/-/health/ready/
```

Expect:

1. **No** scale-to-0 — IdP health stays ≈ 200 during the job
2. `db.sql.gz` + `media.tar.gz` packed
3. Same `authentik-YYYYMMDD-HHMMSS.tar.gz` on NFS (`/backup`) **and** `s3://authentik-backups/`
4. Job fails if either NFS or S3 write fails

```bash
# NFS listing via a throwaway pod, or NAS ls
kubectl -n authentik get job authentik-backup-manual -o wide
aws --endpoint-url http://192.168.0.107:9000 s3 ls s3://authentik-backups/
```

### Lab smoke

- **2026-10-19:** scale-to-0 backup path (superseded by online backup 2026-10-21).
- **2026-10-21:** HA roadmap — CNPG×2, dedicated Redis, online backup, Longhorn IM CPU enforcer.

## Gatus

Online backups no longer take IdP down. Gatus still depends on Authentik OIDC at **startup** (panic on IdP 503) — restore IdP before Gatus if both are down (`GatusDependsOnAuthentikDown` alert).

## Full restore smoke (lab only)

1. Pick a known archive; set ConfigMap `authentik-restore`: `enabled=true`, `force=true`, `source=nfs` (then once with `source=s3`)
2. Confirm `AUTHENTIK_SECRET_KEY` unchanged since backup
3. Argo Sync → Job restores PG then `/media` → scale up
4. Login + TOTP/Passkey for a known user
5. Set `enabled=false` and commit immediately

## Selective MFA smoke

```bash
# 1) Note a test user with TOTP (or Passkey)
# 2) In Authentik UI: remove that user's authenticator device(s)
# 3) Restore from yesterday's (or latest) archive:
cd apps/ops/authentik
./scripts/restore-user-mfa.sh latest <username> auto --i-know-secret-key-matches
# 4) Login again with the same TOTP/Passkey
```

## HPA

Server Chart HPA is enabled (min 2 / max 5, CPU 75%). Backup **deletes** the HPA for the window (Resource-metric HPAs cannot use `minReplicas=0`), after suspending Argo automated sync on Application `authentik` so self-heal does not recreate it mid-backup; then restores the HPA snapshot and re-enables sync. Worker has no HPA (fixed replicas 2). Upstream: https://docs.goauthentik.io/sys-mgmt/ops/autoscaling/hpa/

```bash
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl -n kube-system get deploy metrics-server
kubectl -n authentik get hpa authentik-server
kubectl -n authentik describe hpa authentik-server
```
