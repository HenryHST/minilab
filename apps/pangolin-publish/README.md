# Pangolin publish — public HTTP resources via Integration API + Newt (k3s site)

GitOps reconcile for Pangolin public resources that terminate on the **k3s** Newt site, plus their **Hetzner DNS A** records. Workload apps stay in their own Argo apps (internal Traefik hosts unchanged where applicable).

## Ownership

| Concern | Owner |
|---------|--------|
| Pangolin host / Compose / Traefik | Terraform `module.host` |
| Site **Stadthagen-pro** + LAN targets (`ha02`, `udmse`, `auth`, …) | Terraform `module.pangolin_config` |
| DNS for TF hosts (`api`, `auth`, `ha02`, …) | Terraform `module.dns` |
| Site **k3s** Newt agent | minilab `apps/newt` |
| Public resources on site **k3s** (`termix-ext`, `idp`, …) | this app (Integration API) |
| DNS A for those publish hosts | this app (Hetzner Cloud DNS API) |

Do **not** put GitOps publish hostnames in Terraform `dns_records` or `resources` (dual-write). Inventory/diff: Infra_LAB `terraform/pangolin/scripts/pangolin-status.sh`.

## Resources (ConfigMap `resources.json`)

| Key | Public host | Target (Newt → ClusterIP) | DNS |
|-----|-------------|---------------------------|-----|
| `termix` | `termix-ext.stadthagen.dev` | `termix.termix.svc.cluster.local:8080` | upsert A → Pangolin public IP |
| `idp` | `idp.stadthagen.dev` | `authentik-server.authentik.svc.cluster.local:80` | same |

Auth: **app + Authentik only** (Pangolin `sso: false`). TLS terminates at Pangolin; Newt uses HTTP to the ClusterIP.

## Reconcile

PostSync Job (single script):

1. Upsert Pangolin resource/target on site `k3s` (migrates existing target site/ip/port).
2. If `dns` is not `false`: upsert Hetzner A `subdomain` → `pangolinPublicIp`.
3. If `enabled: false`: disable Pangolin resource and **delete** that A RRset.

ConfigMap keys: `dnsZone`, `pangolinPublicIp`, `resources.json`.

## Toggle

```json
"idp": { "enabled": true, "dns": true, ... }
```

Set `"enabled": false` and sync to disable the resource and remove its GitOps DNS A.

## Prerequisites

1. Newt healthy (`apps/newt`), site name/niceId **`k3s`**.
2. Secret `pangolin-api` with `api-key` (`PANGOLIN_API_KEY`) and `hetzner-token` (`HETZNER_DNS_API_TOKEN`) — Infra_LAB `ansible-playbook site.yaml --tags secrets`.
3. Terraform must **not** manage `idp` / `termix-ext` in `dns_records` or `resources`.

## Sync

Argo Application `pangolin-publish` (project `infrastruktur`, wave **3**).
