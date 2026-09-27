# ByteStash

Code-snippet store on `https://bytestash.stadthagen.dev` (Argo app `bytestash`, sync wave 3).

## Deploy

- Image pin: `ghcr.io/jordan-dalby/bytestash:1.5.12`
- PVC `bytestash-data` → `/data/snippets`
- TLS: cert-manager → `bytestash-tls`
- DNS: Hetzner A `bytestash` → `192.168.0.215` (LAN; not pangolin-publish)
- OIDC: Authentik slug `bytestash`, callback `/api/auth/oidc/callback`

## Secrets (Infra_LAB)

```bash
cd ansible/playbooks/k3s_cluster/secrets
# same value as terraform bytestash_oauth_client_secret
secretspec set BYTESTASH_OAUTH_CLIENT_SECRET --profile cluster --provider cluster_age
secretspec set BYTESTASH_JWT_SECRET --profile cluster --provider cluster_age   # openssl rand -hex 32
cd ..
ansible-playbook site.yaml --tags secrets
```

K8s: `bytestash/bytestash-oauth` (`client-secret`), `bytestash/bytestash-jwt` (`JWT_SECRET`).

## Backup / Restore

- NAS: `mkdir -p /var/nfs/shared/infra01/bytestash-backups`
- CronJob `bytestash-backup-cron` (06:00 UTC) tar’t `/data/snippets` → NFS (Retention 7)
- Manuell: `kubectl -n bytestash create job --from=cronjob/bytestash-backup-cron bytestash-backup-manual`
- Bootstrap-Restore: ConfigMap `bytestash-restore` → `enabled=true` (bei vorhandenen Snippets zusätzlich `force=true`), Argo Sync; danach sofort `enabled=false` committen

## Verify

```bash
kubectl -n bytestash get pods,ingressroute,certificate,pvc
dig +short A bytestash.stadthagen.dev
curl -kI https://bytestash.stadthagen.dev/
```

ADR: [`docs/adr/0021-bytestash.md`](../../docs/adr/0021-bytestash.md), [`docs/adr/0015-backup-restore-cronjobs.md`](../../docs/adr/0015-backup-restore-cronjobs.md). Upstream: [ByteStash](https://github.com/jordan-dalby/ByteStash).
