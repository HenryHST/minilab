# Traefik → Cilium Gateway API — cutover notes

Companion to [ADR-0038](../../../docs/adr/0038-cilium-gateway-api.md) and Infra_LAB ADR-0028 / `cni_cilium`.

## Prerequisites (Infra_LAB)

1. Cilium Gateway API enabled; experimental CRDs include `ExternalAuth`.
2. Traefik Helm release / LB off; VIP `192.168.0.215` on Gateway `gateway-system/nxk3`.
3. Error-pages CEC applied (404 + 500–504 → `error-pages` Service).
4. Argo CD already on HTTPRoute (Ansible postinstall) with listener `https-argocd`.

## GitOps order

1. Merge/sync this branch (AppSet `infra` picks up `gateway` wave 0, then app `HTTPRoute`s).
2. Confirm `kubectl -n gateway-system get gateway nxk3 -o wide` → ADDRESS `.215`, listeners Programmed.
3. Spot-check HTTPRoutes: `kubectl get httproute -A | grep -v Accepted` (expect Accepted/ResolvedRefs).
4. Authentik apps: ExternalAuth uses `/outpost.goauthentik.io/auth/envoy` (outpost mode stays `forward_single`).

## Smoke matrix (short)

| Check | Command / expectation |
|-------|------------------------|
| VIP | `curl -skI --resolve web.stadthagen.dev:443:192.168.0.215 https://web.stadthagen.dev/` → 200 |
| TLS | browser / `openssl s_client` per app hostname |
| Auth | `hubble` / `registry-ui` / `stirling-pdf` / `vw-restore` / `podcraft` → Authentik challenge |
| Redirect | `http://web.stadthagen.dev` → 301 https |
| VW LAN | `vaultwarden.stadthagen.dev` → 302 `vw-ext.stadthagen.dev` |
| Gatus | `/` → gatus, `/uebersicht` → overview |
| Metrics off | `git` / `wupd` `/metrics` → not served on public route |
| Errors | unknown path → styled 404 via CEC |

## Rollback

Re-enable Traefik in Infra_LAB and revert this branch (IngressRoutes). Dual-run is not supported on the same VIP (hard cutover B).
