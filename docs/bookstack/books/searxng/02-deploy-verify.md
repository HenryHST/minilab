# Deploy & Verify

## Secret (Infra_LAB)

```bash
cd ansible/playbooks/k3s_cluster/secrets
secretspec set SEARXNG_SECRET --profile cluster --provider cluster_age
cd ..
ansible-playbook site.yaml --tags secrets
```

Secret: `searxng/searxng-secret` → Key `secret` → Env `SEARXNG_SECRET`.

## Sync

Argo Application `searxng` (path `apps/dev/searxng`, automated, `CreateNamespace=true`).

## DNS

Hetzner Console Zone `stadthagen.dev`: A-Record `searxng` → `192.168.0.215` (nicht pangolin-publish).

## Checks

```bash
kubectl -n searxng get pods,certificate,ingressroute
dig +short A searxng.stadthagen.dev   # → 192.168.0.215
curl -kI https://searxng.stadthagen.dev/
```

Homepage (Tools): Eintrag SearXNG.
