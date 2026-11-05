# ADR-0038: Cilium Gateway API edge (replaces Traefik IngressRoute)

- **Status:** Accepted
- **Datum:** 2026-11-05
- **Kontext:** Hard cutover nXk3 Traefik → Cilium Gateway API; Infra_LAB ADR-0028 / `cni_cilium` Gateway + error-pages CEC; VIP `192.168.0.215`

## Kontext

Alle LAN-Apps nutzten Traefik `IngressRoute` + optional ForwardAuth-Middleware. Cilium 1.20 liefert Gateway API inkl. `ExternalAuth` (GEP-1494). Traefik wird abgeschaltet; dieselbe VIP bedient `Gateway` `gateway-system/nxk3`.

## Entscheidung

- **Edge:** `apps/infra/gateway` (AppSet `infra`, sync wave `0`) ist SoT für HTTPS-Listener + HTTP→HTTPS-Redirect. Ansible bootstrapped nur `https-argocd`.
- **Apps:** `IngressRoute` → `HTTPRoute` + `ReferenceGrant` (TLS Secret → Gateway). Dateiname `httproute.yaml` (bzw. `*-httproute.yaml`).
- **Auth:** Traefik ForwardAuth `/auth/traefik` → HTTPRoute-Filter `ExternalAuth` mit `/outpost.goauthentik.io/auth/envoy`; `ReferenceGrant` in `authentik` für Outpost-Services.
- **Error-Pages:** Traefik Middleware + HostRegexp-Catch-all entfernt; 404/5xx über Cilium Envoy CEC (Infra_LAB). Helm-App `error-pages` bleibt als Backend.
- **traefik-manager:** AppSet-Eintrag deaktiviert (obsolet ohne Traefik).
- **NetworkPolicy:** Ingress von Namespace `traefik` → `kube-system` (Cilium Gateway/Envoy).

## Konsequenzen

- Cutover braucht synchronen Merge dieses Branches mit Infra_LAB Traefik-off + Gateway enable.
- Experimental-Channel CRDs für `ExternalAuth` vorausgesetzt (Cilium Gateway API install).
- Chart-Templates Traefik-IngressRoute (termix/vaultwarden) und App `traefik-manager` entfernt; Plain YAML HTTPRoute ist maßgeblich.
