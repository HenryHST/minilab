# Headlamp (nXk3)

In-cluster Kubernetes UI with Authentik OIDC SSO.

## SSO

- Authentik app slug: `headlamp` (issuer `https://idp.stadthagen.dev/application/o/headlamp/`)
- Callback: `https://headlamp.stadthagen.dev/oidc-callback`
- Helm: `config.oidc.externalSecret` → Secret `headlamp-oidc` in `kube-system` (keys `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_ISSUER_URL`, `OIDC_SCOPES`)
- RBAC: `oidc-rbac.yaml` binds group **Headlamp Admins** to `cluster-admin`
- Break-glass: `login-sa.yaml` (SA token) if OIDC is down

Requires k3s kube-apiserver OIDC (`oidc-issuer-url` / `oidc-client-id` / claims) — see Infra_LAB `ansible/playbooks/k3s_cluster` README § Headlamp SSO.

## Deploy order

1. Pin `headlamp_oauth_client_secret` + `secretspec set HEADLAMP_OAUTH_CLIENT_SECRET`
2. Terraform Authentik apply
3. Ansible `--tags secrets` then k3s config (API OIDC)
4. Argo sync this app
5. Login at https://headlamp.stadthagen.dev
