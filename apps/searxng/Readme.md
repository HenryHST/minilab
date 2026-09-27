# SearXNG

Privacy-friendly metasearch on `https://searxng.stadthagen.dev` (Argo app `searxng`, sync wave 3).

## Deploy

- Image pin: `docker.io/searxng/searxng:2026.9.25-12f8b6515`
- ConfigMap `searxng-settings` → `/etc/searxng/settings.yml`
- TLS: cert-manager Certificate → Secret `searxng-tls`
- DNS: Hetzner A `searxng` → Traefik LB `192.168.0.215` (LAN; not pangolin-publish)

## Secret

`SEARXNG_SECRET` from Infra_LAB SecretSpec → K8s Secret `searxng/searxng-secret` key `secret`:

```bash
cd ansible/playbooks/k3s_cluster/secrets
secretspec set SEARXNG_SECRET --profile cluster --provider cluster_age   # e.g. openssl rand -hex 32
cd ..
ansible-playbook site.yaml --tags secrets
```

## Verify

```bash
kubectl -n searxng get pods,ingressroute,certificate
dig +short A searxng.stadthagen.dev
curl -kI https://searxng.stadthagen.dev/
```

ADR: [`docs/adr/0018-searxng.md`](../../docs/adr/0018-searxng.md). Upstream: [SearXNG container docs](https://docs.searxng.org/admin/installation-docker.html).
