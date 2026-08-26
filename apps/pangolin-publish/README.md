# Pangolin publish — public HTTP resources via Integration API + Newt (k3s site)

GitOps reconcile for Pangolin public resources that terminate on the **k3s** Newt site.
Termix workload stays in `apps/termix` (internal Traefik host unchanged).

## URLs

| Access | Hostname | Path |
|--------|----------|------|
| Internal / LAN | `https://termix.stadthagen.dev` | Traefik IngressRoute (`apps/termix`) |
| Internet | `https://termix-ext.stadthagen.dev` | Pangolin → Newt → `termix.termix.svc.cluster.local:8080` |

Auth on both hosts: **Termix + Authentik only** (Pangolin `sso: false`).

## Toggle

Edit `resources.json` in [`reconcile-job.yaml`](reconcile-job.yaml) ConfigMap:

```json
"termix": { "enabled": true, ... }
```

Set `"enabled": false` and sync to **disable** the Pangolin resource (does not delete). Add further keys under the same map for more apps.

## Prerequisites

1. Newt app healthy (`apps/newt`), site name/niceId **`k3s`** in Pangolin.
2. SecretSpec `PANGOLIN_API_KEY` → Secret `pangolin-api` in `pangolin-publish` (`ansible-playbook site.yaml --tags secrets`).
3. DNS A `termix-ext` → Pangolin public IP (`terraform/pangolin` `dns_records.termix_ext`).
4. Authentik redirect URIs for `termix_external_url` (`terraform/authentik`).

## Sync

Argo Application `pangolin-publish` (project `infrastruktur`, wave **3**). PostSync Job upserts resources/targets after each sync.
