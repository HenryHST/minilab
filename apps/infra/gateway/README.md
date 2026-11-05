# gateway — Cilium Gateway API edge

Central `Gateway` `gateway-system/nxk3` on VIP `192.168.0.215` (same as former Traefik LB).

| Item | Value |
|------|--------|
| GatewayClass | `cilium` |
| HTTP :80 | redirect → HTTPS |
| HTTPS :443 | one listener per app hostname + TLS secret (cross-ns via ReferenceGrant in app ns) |
| App routes | `HTTPRoute` next to each app (`httproute.yaml`) |

**Ownership:** this AppSet app is the listener source of truth after GitOps sync. Infra_LAB Ansible bootstraps `https-argocd` so Argo can come up before this app syncs.

**Error pages:** branded Gateway 5xx via CEC is **off** (Cilium skips bare HCM; Infra_LAB ADR-0028). App `error-pages` remains for manual use.

**Auth:** HTTPRoute `ExternalAuth` → Authentik Envoy outposts — see [`EXTERNALAUTH.md`](EXTERNALAUTH.md).

**Smoke:** CronJob `gateway-system/gateway-smoke` every 15m (VIP `.215`). Alerts in `homelab-alerts` group `gateway.edge`.

```bash
kubectl -n gateway-system create job --from=cronjob/gateway-smoke smoke-manual
kubectl -n gateway-system logs job/smoke-manual -f
```
