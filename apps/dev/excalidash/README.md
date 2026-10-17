# ExcaliDash

Self-hosted Excalidraw workspaces on `https://excalidash.stadthagen.dev` (Argo app `excalidash`, sync wave 3).

## Deploy

- Images: `zimengxiong/excalidash-backend:0.6.5` + `zimengxiong/excalidash-frontend:0.6.5`
- PVC `excalidash-data` → backend `/app/prisma` (SQLite)
- IngressRoute → frontend `:8080`; frontend proxies API / `socket.io` via `BACKEND_URL`
- TLS: cert-manager → `excalidash-tls`
- Auth: `AUTH_MODE=oidc_enforced`, Authentik slug `excalidash`, callback `/api/auth/oidc/callback`
- `TRUST_PROXY=1` (Traefik → frontend → backend)
- Admin role: Authentik group `excalidash_admins` → `OIDC_ADMIN_GROUPS`

## Secrets (Infra_LAB)

```bash
cd ansible/playbooks/k3s_cluster/secrets
# same value as terraform excalidash_oauth_client_secret
secretspec set EXCALIDASH_OAUTH_CLIENT_SECRET --profile cluster --provider cluster_age
secretspec set EXCALIDASH_JWT_SECRET --profile cluster --provider cluster_age   # openssl rand -hex 32
secretspec set EXCALIDASH_CSRF_SECRET --profile cluster --provider cluster_age  # openssl rand -hex 32
cd ..
ansible-playbook site.yaml --tags secrets
```

K8s: `excalidash/excalidash-oauth` (`client-secret`), `excalidash/excalidash-app` (`JWT_SECRET`, `CSRF_SECRET`).

OIDC app: Infra_LAB `terraform/authentik/modules/dev/authentik_excalidash.tf`.

## Verify

```bash
kubectl -n excalidash get pods,ingressroute,certificate,pvc,secrets
curl -kI https://excalidash.stadthagen.dev/
```

UI: **Continue with authentik** → login → return to ExcaliDash.

Upstream: [ExcaliDash](https://github.com/ZimengXiong/ExcaliDash) · [Authentik integration](https://integrations.goauthentik.io/dashboards/excalidash/).
