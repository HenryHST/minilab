# traefik-manager — DEPRECATED

Traefik Manager UI for the former Traefik edge. **Deprecated** after the Cilium Gateway API cutover ([ADR-0038](../../../docs/adr/0038-cilium-gateway-api.md)).

- AppSet entry in `applicationset-ops.yaml` is commented out (prune on sync).
- Manifests remain in-tree for reference / possible delete in a follow-up.
- Edge is now `apps/infra/gateway` (`gateway-system/nxk3` on VIP `.215`).
