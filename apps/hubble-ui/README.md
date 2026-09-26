# Hubble UI (Exposure only)

HTTPS: **https://hubble.stadthagen.dev**

## Ownership (ADR-0018)

| Piece | Owner |
|-------|--------|
| `hubble-relay` / `hubble-ui` Deployments | Infra_LAB Ansible `cni_cilium` (`cilium_hubble_*`) |
| Certificate, IngressRoute, NetworkPolicy, ForwardAuth Middleware | This Argo app |
| Authentik Outpost `ak-outpost-hubble-ui` | Day-0 blueprint `day0-hubble-ui` |

Do **not** deploy a second Hubble UI Helm chart here.

## Prerequisites

1. Ansible: `cilium_hubble_relay_enabled: true` and `cilium_hubble_ui_enabled: true`, then `--tags cilium`.
2. Authentik Day-0 blueprint applied (Outpost Service Ready).
3. DNS `hubble.stadthagen.dev` → Traefik LB.

## Verify

```bash
kubectl -n kube-system get deploy hubble-relay hubble-ui
kubectl -n authentik get svc ak-outpost-hubble-ui
kubectl -n argocd get application hubble-ui
curl -sI https://hubble.stadthagen.dev | head -5
```
