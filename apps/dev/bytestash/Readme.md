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

## Verify

```bash
kubectl -n bytestash get pods,ingressroute,certificate,pvc
dig +short A bytestash.stadthagen.dev
curl -kI https://bytestash.stadthagen.dev/
```

ADR: [`docs/adr/0021-bytestash.md`](../../docs/adr/0021-bytestash.md). Upstream: [ByteStash](https://github.com/jordan-dalby/ByteStash).
