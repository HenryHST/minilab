# Pangolin publish — public HTTP resources via Integration API + Newt (k3s site)

GitOps reconcile for Pangolin public resources that terminate on the **k3s** Newt site.
Workload apps stay in their own Argo apps (internal Traefik hosts unchanged where applicable).

## Resources (ConfigMap `resources.json`)

| Key | Public host | Target (Newt → ClusterIP) | Notes |
|-----|-------------|---------------------------|--------|
| `termix` | `termix-ext.stadthagen.dev` | `termix.termix.svc.cluster.local:8080` | Internal LAN: `termix.stadthagen.dev` via Traefik |
| `idp` | `idp.stadthagen.dev` | `authentik-server.authentik.svc.cluster.local:80` | Migrated from Pangolin site Stadthagen-pro / `192.168.0.210:9443` |

Auth: **app + Authentik only** (Pangolin `sso: false`). TLS terminates at Pangolin; Newt uses HTTP to the ClusterIP.

## Toggle

Edit `resources.json` in [`reconcile-job.yaml`](reconcile-job.yaml):

```json
"idp": { "enabled": true, ... }
```

Set `"enabled": false` and sync to **disable** the Pangolin resource. Reconcile **migrates** an existing target to the k3s site (updates siteId/ip/port) instead of leaving a stale Stadthagen-pro target.

## Prerequisites

1. Newt healthy (`apps/newt`), site name/niceId **`k3s`**.
2. SecretSpec `PANGOLIN_API_KEY` → Secret `pangolin-api` (`ansible-playbook site.yaml --tags secrets`).
3. DNS A for public hosts → Pangolin IP (`terraform/pangolin` `dns_records`).
4. For `idp`: Authentik app synced (minilab `apps/authentik`); after cutover, remove `idp` from `terraform/pangolin` `resources` and `terraform state rm` so Terraform does not reset the target.

## Sync

Argo Application `pangolin-publish` (project `infrastruktur`, wave **3**). PostSync Job upserts resources/targets after each sync.
