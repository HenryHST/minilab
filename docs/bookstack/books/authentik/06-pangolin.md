---
title: Externe Ressourcen mit Pangolin
book_version: "1.2.0"
---

# Externe Ressourcen mit Pangolin

Nur ausgewählte Dienste sind aus dem Internet erreichbar. Der Tunnel ist Newt im Cluster (Site `k3s`). Die öffentlichen Ressourcen und ihre DNS-A-Records legt die Argo-App `pangolin-publish` per PostSync an ([ADR-0011](../../../adr/0011-pangolin-public-exposure.md)).

## Ownership

| | Eigentümer |
|--|--|
| Pangolin-Host, Compose, LAN-Sites | OpenTofu `terraform/pangolin` |
| Newt-Agent, Site `k3s` | GitOps `apps/ops/newt` |
| Öffentliche Ressourcen auf Site `k3s` und ihre Hetzner-A-Records | GitOps `apps/ops/pangolin-publish` |

Dieselbe Hostname nicht parallel in Terraform-DNS und in `resources.json` pflegen. Sonst driftet der Eintrag.

## Ressource `idp`

In der ConfigMap von `pangolin-publish` (Schlüssel `resources.json`):

| | |
|--|--|
| Key | `idp` |
| Öffentlicher Host | `idp.stadthagen.dev` |
| Ziel | `authentik-server.authentik.svc.cluster.local:80`, Methode HTTP |
| `ssl` | true (TLS am Pangolin-Edge) |
| `sso` | false (Login bleibt an Authentik) |
| `dns` | true (A-Record auf die Pangolin-Public-IP) |

Der Browser spricht HTTPS mit Pangolin. Newt leitet HTTP an die ClusterIP weiter. Auth prüft Authentik, nicht Pangolin.

Voraussetzungen: Newt healthy, Secret `pangolin-api` mit API-Key und Hetzner-Token (Ansible `--tags secrets`).

## Öffentliche Apps (`resources.json`)

| Key | Öffentlicher Host | Ziel | `enabled` |
|--|--|--|--|
| `termix` | `termix-ext.stadthagen.dev` | `termix.termix.svc.cluster.local:8080` | true |
| `karakeep` | `karakeep-ext.stadthagen.dev` | `karakeep.karakeep.svc.cluster.local:3000` | true |
| `bookstack` | `bookstack-ext.stadthagen.dev` | `bookstack.bookstack.svc.cluster.local:80` | true |
| `vaultwarden` | `vaultwarden-ext.stadthagen.dev` | `vaultwarden.vaultwarden.svc.cluster.local:80` | true |
| `paperless` | `paperless-ext.stadthagen.dev` | `paperless-web.paperless.svc.cluster.local:8000` | false (vorbereitet) |
| `idp` | `idp.stadthagen.dev` | `authentik-server.authentik.svc.cluster.local:80` | true |

Der interne Traefik-Host (z. B. `book.stadthagen.dev`, `vaultwarden.stadthagen.dev`) bleibt für LAN/VPN. NetworkPolicy der Workloads muss Ingress aus Namespace `newt` erlauben.

### OIDC und `*_external_url`

Wenn die App öffentlich ist und OIDC nutzt, müssen die Redirect-URLs in OpenTofu die externe URL treffen (`termix_external_url`, `bookstack_external_url`, `vaultwarden_external_url`, … und `additional_redirect_bases`). Sonst bricht der Login nach dem IdP ab.

**BookStack / Vaultwarden** sind nicht host-aware: `APP_URL` bzw. `DOMAIN` in minilab zeigen auf die `-ext`-URL (OIDC-Callback). Launch-URL in Authentik bleibt die LAN-URL. Details: Kapitel **OpenTofu** und **Onboarding**; Infra_LAB-Buch Kapitel Pangolin-Ext BookStack/Vaultwarden.

## Toggle

```json
"idp": { "enabled": true, "dns": true, ... }
```

`enabled: false` und Sync: Pangolin-Ressource aus, zugehöriger A-Record gelöscht. So lässt sich die Veröffentlichung ohne Terraform-Änderung zurücknehmen.

## Checks

1. `kubectl -n argocd get application pangolin-publish newt`
2. `https://idp.stadthagen.dev` öffnet die Authentik-Login-Seite.
3. `https://bookstack-ext.stadthagen.dev` / `https://vaultwarden-ext.stadthagen.dev` — DNS A → Pangolin-Public-IP, OIDC-Login.
4. Diff und Inventar: Infra_LAB `terraform/pangolin/scripts/pangolin-status.sh`.

README: [`apps/ops/pangolin-publish/README.md`](../../../../apps/ops/pangolin-publish/README.md).
