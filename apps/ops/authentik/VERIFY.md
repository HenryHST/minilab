# Authentik backup / restore — verification checklist

Upstream: https://docs.goauthentik.io/sys-mgmt/ops/backup-restore/

## Prerequisites

- Secret `authentik/authentik-backup-s3` present (Infra_LAB `k3s_secrets` + RustFS keys)
- Bucket `authentik-backups` on pi7cl (`ansible-playbook site.yaml --tags rustfs --limit pi7cl`)
- NFS dir `…/authentik-backups` exists
- CronJobs synced: `authentik-backup-0230`, `authentik-backup-1150` (old `authentik-backup-cron` removed)

## Manual backup smoke

```bash
kubectl -n authentik create job --from=cronjob/authentik-backup-0230 authentik-backup-manual
kubectl -n authentik logs -f job/authentik-backup-manual -c backup
```

Expect:

1. Scale server+worker to 0 → Traefik app-down / 5xx on `https://idp.stadthagen.dev`
2. `db.sql.gz` + `media.tar.gz` packed
3. Same `authentik-YYYYMMDD-HHMMSS.tar.gz` on NFS (`/backup`) **and** `s3://authentik-backups/`
4. Scale-up → `kubectl wait --for=condition=available` succeeds; health `/-/health/ready/` ≈ 200
5. Job fails if either NFS or S3 write fails

```bash
# NFS listing via a throwaway pod, or NAS ls
kubectl -n authentik get job authentik-backup-manual -o wide
aws --endpoint-url http://192.168.0.107:9000 s3 ls s3://authentik-backups/
```

### Lab smoke (2026-10-19)

- Bucket `authentik-backups` created on pi7cl; Secret `authentik-backup-s3` present.
- Job `authentik-backup-manual` **Complete** (~110s): archive `authentik-20261019-131325.tar.gz` on NFS and S3 (~9.3 MiB); server/worker restored to 2/2.
- Until minilab `main` contains these manifests, Argo ApplicationSet `ops` self-heal may recreate `authentik-backup-cron` and the old `backup-runner-role` — push/sync minilab before relying on the schedule.

## Gatus

During Berlin `02:30` and `11:50` (±30m): no Pushover for endpoint `authentik`. Paperless keeps its own `05:00` UTC window.

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

## HPA note

If `HorizontalPodAutoscaler` for `authentik-server` / `authentik-worker` exists, backup pauses it (`minReplicas`/`maxReplicas`=0) for the window, then restores. Enabling chart HPA (min 2 / max 5) is an optional follow-up — see https://docs.goauthentik.io/sys-mgmt/ops/autoscaling/hpa/
