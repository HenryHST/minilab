# gateway — Cilium Gateway API edge

Central `Gateway` `gateway-system/nxk3` on VIP `192.168.0.215` (same as former Traefik LB).

| Item | Value |
|------|--------|
| GatewayClass | `cilium` |
| HTTP :80 | redirect → HTTPS |
| HTTPS :443 | one listener per app hostname + TLS secret (cross-ns via ReferenceGrant in app ns) |
| App routes | `HTTPRoute` next to each app (`httproute.yaml`) |

**Ownership:** this AppSet app is the listener source of truth after GitOps sync. Infra_LAB Ansible bootstraps `https-argocd` so Argo can come up before this app syncs.

**Error pages:** 404/5xx via Cilium Envoy CEC (Infra_LAB `cni_cilium`), not Traefik Middleware / HostRegexp catch-all.

**Auth:** Authentik ForwardAuth → HTTPRoute `ExternalAuth` (`/outpost.goauthentik.io/auth/envoy`).
