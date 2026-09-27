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
# Expect 302 → https://idp.stadthagen.dev/... (not cluster-local authentik-server URL)
```

## Troubleshoot empty / HTTP 500 page

ForwardAuth needs Outpost Service `ak-outpost-hubble-ui`. After cluster rebuild the DB object can exist while K8s Deploy/Service are missing → Traefik returns **500 empty**.

```bash
# Recreate K8s resources for the managed outpost
kubectl -n authentik exec deploy/authentik-worker -c worker -- ak shell -c "
from authentik.outposts.models import Outpost
from authentik.outposts.tasks import outpost_controller, outpost_send_update
o = Outpost.objects.get(name='hubble-ui')
outpost_controller.send(str(o.pk)); outpost_send_update.send(str(o.pk))
"
kubectl -n authentik get deploy,svc ak-outpost-hubble-ui
```

Outpost config must set `authentik_host_browser: https://idp.stadthagen.dev` (Day-0 blueprint) so the login redirect is publicly reachable.
