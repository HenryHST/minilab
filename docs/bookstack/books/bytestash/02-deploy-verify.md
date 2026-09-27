# Deploy, OIDC & Verify

## Secrets + Terraform

1. Pin `bytestash_oauth_client_secret` in `dev.secrets.tfvars` (= SecretSpec `BYTESTASH_OAUTH_CLIENT_SECRET`).
2. `secretspec set BYTESTASH_JWT_SECRET` + `--tags secrets`.
3. `terraform apply` Authentik (App slug `bytestash`, Redirect `/api/auth/oidc/callback`).
4. User in Gruppe `bytestash_users` (Henry via access_control).

## Sync

Argo Application `bytestash` (path `apps/bytestash`).

## Checks

```bash
kubectl -n bytestash get pods,certificate,pvc
dig +short A bytestash.stadthagen.dev
curl -kI https://bytestash.stadthagen.dev/
```

Login: Authentik SSO → Snippet-UI.
