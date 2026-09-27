# Karakeep

Bookmark-everything app on `https://karakeep.stadthagen.dev` (LAN) and `https://karakeep-ext.stadthagen.dev` (Pangolin). Argo app `karakeep`, sync wave 3.

Upstream: [karakeep-app/karakeep](https://github.com/karakeep-app/karakeep) · Chart `0.33.1` · [Authentik integration](https://integrations.goauthentik.io/documentation/karakeep/)

## Deploy

- Helm: vendored `charts/karakeep/` → committed `helm-manifest.yaml` (ADR-0014)
- Regenerate: `helm template karakeep ./charts/karakeep -f values.yaml --namespace karakeep > helm-manifest.yaml` (strip meilisearch test Pod)
- Components: Karakeep STS + Chrome (`zenika/alpine-chrome`, not gcr.io) + Meilisearch
- PVC: Longhorn `data-karakeep-0` (5Gi, 2 replicas) → `/data`; Meili 5Gi
- TLS: cert-manager → `karakeep-tls`
- DNS LAN: Hetzner A `karakeep` → `192.168.0.215` (not pangolin-publish)
- DNS public: `karakeep-ext` via `apps/ops/pangolin-publish`
- OIDC: Authentik slug `karakeep`, callback `/api/auth/callback/custom` (LAN + ext); `AUTH_TRUST_HOST=true` (no pinned `NEXTAUTH_URL`) so OAuth works on both hosts

## Secrets (Infra_LAB)

```bash
cd ansible/playbooks/k3s_cluster/secrets
# same value as terraform karakeep_oauth_client_secret
secretspec set KARAKEEP_OAUTH_CLIENT_SECRET --profile cluster --provider cluster_age
secretspec set KARAKEEP_NEXTAUTH_SECRET --profile cluster --provider cluster_age   # openssl rand -base64 36
secretspec set KARAKEEP_MEILI_MASTER_KEY --profile cluster --provider cluster_age  # openssl rand -base64 36 | tr -dc A-Za-z0-9
cd ..
ansible-playbook site.yaml --tags secrets
```

K8s: `karakeep/karakeep` (`NEXTAUTH_SECRET`, `OAUTH_CLIENT_ID=karakeep`, `OAUTH_CLIENT_SECRET`), `karakeep/karakeep-meilesearch` (`MEILI_MASTER_KEY`).

## Backup / Restore

- NAS: `mkdir -p /var/nfs/shared/infra01/karakeep-backups`
- CronJob `karakeep-backup-cron` (07:00 UTC) tar’t `/data` → NFS (Retention 7)
- Manuell: `kubectl -n karakeep create job --from=cronjob/karakeep-backup-cron karakeep-backup-manual`
- Bootstrap-Restore: ConfigMap `karakeep-restore` → `enabled=true` (bei vorhandenen Daten zusätzlich `force=true`), Argo Sync; danach sofort `enabled=false` committen
- Meili-Index baut sich nach Restore neu auf

## Verify

```bash
kubectl -n karakeep get pods,ingressroute,certificate,pvc
dig +short A karakeep.stadthagen.dev
dig +short A karakeep-ext.stadthagen.dev
curl -sI https://karakeep.stadthagen.dev | head -5
```

ADR: [`docs/adr/0023-karakeep.md`](../../docs/adr/0023-karakeep.md), [`docs/adr/0015-backup-restore-cronjobs.md`](../../docs/adr/0015-backup-restore-cronjobs.md).
