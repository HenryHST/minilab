# SearXNG

Privacy-friendly metasearch on `https://searxng.stadthagen.dev` (Argo app `searxng`, sync wave 3).

## Deploy

- Image pin: `docker.io/searxng/searxng:2026.11.26-b5605b8f2`
- ConfigMap `searxng-settings` → `/etc/searxng/settings.yml` (kuratierte Engines, Autocomplete, Plugins)
- ConfigMap `searxng-favicons` → `/etc/searxng/favicons.toml`
- PVC `searxng-cache` (1 Gi Longhorn) → `/var/cache/searxng`
- TLS: cert-manager Certificate → Secret `searxng-tls`
- Ingress: Cilium Gateway API `HTTPRoute` (LAN; not pangolin-publish)
- DNS: Hetzner A `searxng` → Gateway LB `192.168.0.215`

## Config highlights

- Engines: `keep_only` (Brave/DDG/Qwant + wiby/seznam/naver/yandex + Wiki/Wikidata/YouTube/IMDb/Geizhals/Anna’s Archive + GitHub/GitLab/SO/Hugging Face); Upstream-`disabled` per Override aktiviert; `general.contact_url` für Wikipedia/Wikidata
- Startpage/Mojeek bewusst nicht: Upstream `inactive` (Proof-of-Work-CAPTCHA)
- UX: Autocomplete `duckduckgo`, Favicons `duckduckgo`, `ui.default_locale: de`
- Plugins: Defaults + infinite scroll + OA DOI rewrite; Hostnames `high_priority` für Wiki/GitHub/SO/…
- Deployment: `strategy: Recreate` wegen RWO-PVC `searxng-cache`
- Kein Valkey/Limiter (ADR-0018)

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
kubectl -n searxng get pods,httproute,certificate,pvc
dig +short A searxng.stadthagen.dev
curl -kI https://searxng.stadthagen.dev/
```

ADR: [`docs/adr/0018-searxng.md`](../../docs/adr/0018-searxng.md). Upstream: [SearXNG container docs](https://docs.searxng.org/admin/installation-docker.html).
