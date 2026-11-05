# ExternalAuth matrix (Cilium Gateway)

Post-cutover: Traefik ForwardAuth Middleware → HTTPRoute filter `ExternalAuth`
against Authentik Envoy outposts (`/outpost.goauthentik.io/auth/envoy`).

| App | Host | HTTPRoute | Outpost Service | Day-0 blueprint |
|-----|------|-----------|-----------------|-----------------|
| hubble-ui | hubble.stadthagen.dev | `apps/ops/hubble-ui/httproute.yaml` | `ak-outpost-hubble-ui` | `day0-hubble-ui` |
| registry-ui | registry-ui.stadthagen.dev | `apps/ops/registry-ui/manifests/httproute.yaml` | `ak-outpost-registry-ui` | `day0-registry-ui` |
| stirling-pdf | stirling-pdf.stadthagen.dev | `apps/dev/stirling-pdf/httproute.yaml` | `ak-outpost-stirling-pdf` | `day0-stirling-pdf` |
| podcraft | podcraft.stadthagen.dev | `apps/dev/podcraft/httproute.yaml` | `ak-outpost-podcraft` (paths beyond public `/` `/login` `/static`) | `day0-podcraft` |
| vaultwarden restore-ui | vw-restore.stadthagen.dev | `apps/dev/vaultwarden/restore-ui-httproute.yaml` | `ak-outpost-vw-restore` | `day0-vw-restore` |

**ReferenceGrant:** `apps/ops/authentik/referencegrant-externalauth.yaml` (HTTPRoute → Outpost Services).

**Soll unauth:** HTTP 302 → `idp.stadthagen.dev` authorize.  
**Soll auth:** 200 UI (Browser session / cookies).

**Not ExternalAuth (by design):** apps with native OIDC (e.g. vaultwarden main, termix, forgejo, bookstack).  
**Removed:** n8n ForwardAuth (app retired).

Audit date: 2026-11-05 — all five rows present; no ForwardAuth gap vs former Traefik set (minus n8n).
