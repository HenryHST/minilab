# Deploy & Verify

## Voraussetzungen

1. Pin `karakeep_oauth_client_secret` in `dev.secrets.tfvars` (= SecretSpec `KARAKEEP_OAUTH_CLIENT_SECRET`).
2. SecretSpec: `KARAKEEP_NEXTAUTH_SECRET`, `KARAKEEP_MEILI_MASTER_KEY`; `ansible-playbook site.yaml --tags secrets`.
3. `terraform apply` Authentik (App slug `karakeep`, Redirects LAN + Ext `/api/auth/callback/custom`).
4. User in Gruppe `karakeep_users` (Henry via access_control).
5. Hetzner A `karakeep` → `192.168.0.215` (nicht pangolin-publish).
6. NAS: `mkdir -p /var/nfs/shared/infra01/karakeep-backups`.

## Sync

Argo Application `karakeep` (path `apps/dev/karakeep`). Pangolin-Resource `karakeep-ext` via `pangolin-publish`.

## Checks

```bash
kubectl -n karakeep get pods,certificate,pvc,ingressroute
dig +short A karakeep.stadthagen.dev
dig +short A karakeep-ext.stadthagen.dev
curl -sI https://karakeep.stadthagen.dev | head -5
```
