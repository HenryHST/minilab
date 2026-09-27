# Paperless-ngx

Document management with OCR (deu+eng), Authentik OIDC, Gotenberg + Tika, HPScan NFS consume, shared Redis.

| | |
|--|--|
| Argo | ApplicationSet `dev`, wave `3`, NS `paperless` |
| Images | `paperless-ngx:3.2.1`, `postgres:18`, `gotenberg:8.37.0`, `tika:3.3.0.0` |
| Redis | `redis://redis.redis.svc.cluster.local:6379/0` (`apps/infra/redis`) |
| LAN | https://paperless.stadthagen.dev |
| Ext | https://paperless-ext.stadthagen.dev (pangolin-publish `enabled: false` until flipped) |
| OCR workers | Deployment `paperless-worker` + HPA 1–3 (pinned to `nxk3-w01` with web; hostPath media) |
| Storage | hostPath/local on `nxk3-w01` (Postgres/data/media/export); HPScan NFS consume |

## Secrets (before first sync)

```bash
# SecretSpec keys: PAPERLESS_OAUTH_CLIENT_SECRET, PAPERLESS_SECRET_KEY,
# PAPERLESS_DB_PASSWORD, PAPERLESS_ADMIN_PASSWORD (+ SMTP via AUTHENTIK_EMAIL_PASSWORD)
ansible-playbook site.yaml --tags secrets
```

See `secret.example.yaml.txt`.

## Prerequisites

1. un10 HPScan NFS ACL includes k3s node IPs.
2. LAN DNS `paperless.stadthagen.dev` → `192.168.0.215`.
3. NFS dir `192.168.0.25:/var/nfs/shared/infra01/paperless-backups` exists.

## Verify

```bash
kubectl -n argocd get application paperless redis
kubectl -n paperless get pods,hpa,ingressroute,pvc
kubectl -n redis exec deploy/redis -- redis-cli ping
```

OIDC login via LAN; drop a scan into HPScan → consume.

## Restore

Set ConfigMap `paperless-restore` `enabled: true`, scale web/worker to 0, restore `pg_dump` + `data-media.tar.gz` from NFS archive into PVCs, scale up, set `enabled: false`.

ADR: [`docs/adr/0026-paperless-ngx.md`](../../docs/adr/0026-paperless-ngx.md).
