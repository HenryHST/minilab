# ADR-0011: Selektive Public Exposure über Pangolin

- **Status:** Accepted
- **Datum:** 2026-09-11
- **Kontext:** `infra/newt/`, `apps/pangolin-publish/`

## Kontext

Nur ausgewählte Dienste sollen aus dem Internet erreichbar sein. Pangolin (Newt-Tunnel) und Hetzner-DNS existieren bereits über Terraform; doppelte Ownership derselben Hostnames führt zu Drift.

## Entscheidung

- **Newt**-Agent im Cluster (Site `k3s`) als Tunnel zur Pangolin-Site.
- **pangolin-publish** (PostSync Job) upsertet öffentliche Ressourcen (`termix-ext`, `idp`, …) und zugehörige Hetzner-A-Records.
- Interne Traefik-Hosts (`*.stadthagen.dev` → Traefik LB) bleiben für LAN/VPN unverändert.
- Ownership-Trennung: Terraform verwaltet Host/Compose und LAN-Sites; GitOps nur k3s-Publish-Hosts — **kein Dual-Write** derselben DNS-/Resource-Einträge.
- Auth an der App bzw. Authentik; Pangolin `sso: false` für diese Ressourcen. TLS terminiert am Pangolin-Edge.

Details: [`apps/pangolin-publish/README.md`](../../apps/pangolin-publish/README.md).

## Konsequenzen

- Neue öffentliche k3s-Dienste: Eintrag in `resources.json` + Sync, nicht in Terraform `dns_records` für dieselbe Hostname.
- Abhängigkeit: Newt healthy, Secret `pangolin-api` (API-Key + Hetzner-Token).
