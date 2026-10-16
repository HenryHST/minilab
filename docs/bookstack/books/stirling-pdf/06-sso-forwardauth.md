---
title: SSO ForwardAuth
book_version: "1.3.0"
---


# SSO ForwardAuth

> **Buch** v1.3.0 · Stand: 2026-10-16

Stirling-PDF hat **kein** natives OIDC. Schutz wie n8n / Hubble / Registry-UI: **Traefik ForwardAuth** → Authentik Outpost.

| | |
|--|--|
| Day-0 Blueprint | minilab `apps/ops/authentik/blueprints/day0-stirling-pdf.yaml` (ConfigMap `authentik-blueprints-day0`) |
| Outpost / Service | `ak-outpost-stirling-pdf` (Namespace `authentik`) |
| Traefik Middleware | `stirling-pdf-authentik` → `…/outpost.goauthentik.io/auth/traefik` |
| IngressRoute | Middleware an Host `stirling-pdf.stadthagen.dev` |
| Gruppen (TF) | `stirling_pdf_admins` / `stirling_pdf_users` — Infra_LAB `modules/shared/authentik_stirling_pdf.tf` |
| Gatus | Gruppe `sso`, erwartet **302** (unauthentifiziert, `ignore-redirect: true`) |

Ownership: Blueprint = Proxy Provider + App + Outpost + PolicyBindings; Terraform = Gruppen + User-Membership (ADR-0017).

## Incident 2026-10-16 — Gatus „down“, App antwortet 200

### Symptom

- Gatus Endpoint `stirling-pdf` (Gruppe `sso`) rot / Alert
- App selbst erreichbar: `curl` → **HTTP 200**, UI ohne Login
- Peer-SSO (n8n, hubble, registry-ui): unauthentifiziert **302** → IdP

### Hypothesen

| ID | Hypothese | Ergebnis | Evidenz |
|--|--|--|--|
| H1 | Pod/Deploy down | **verworfen** | `deploy/stirling-pdf` Ready; App HTTP 200 |
| H2 | TLS / Ingress kaputt | **verworfen** | Host erreichbar, Zertifikat ok |
| H3 | Kein ForwardAuth (Middleware/Outpost fehlen) | **bestätigt** | Live-IngressRoute ohne `middlewares`; kein `ak-outpost-stirling-pdf`; kein Middleware im NS `stirling-pdf` |
| H4 | Gatus erwartet falschen Status | **bestätigt** | Check auf `[STATUS] == 401`; Peers und FA erwarten **302** |

### Root Cause

1. **SSO fehlte:** Stirling war öffentlich (kein Day-0 Outpost, keine Traefik-Middleware).
2. **Monitor falsch:** Gatus behandelte Stirling wie Basic-Auth (`401`), nicht wie ForwardAuth (`302`).

Beides zusammen → dauerhaft rot, obwohl die App „gesund“ war.

### Fix

1. Day-0 Blueprint `day0-stirling-pdf` + Embed in `blueprints-configmap.yaml`
2. Middleware `stirling-pdf-authentik` + IngressRoute-Bindung
3. TF-Gruppen + Membership `henry` → `stirling_pdf_admins`
4. Gatus: `[STATUS] == 302` (wie n8n/hubble/registry-ui)
5. Bruno Day-0 Smoke: Slug `stirling-pdf` in `10-day0-forwardauth.bru`

minilab Commit `3d90359`; Infra_LAB `ec9d103`.

### Verify

```bash
# Unauthentifiziert → IdP (wie Peers)
curl -sI --max-redirs 0 https://stirling-pdf.stadthagen.dev | head -n5
# erwartet: HTTP/2 302, Location: https://idp.stadthagen.dev/application/o/authorize/...

kubectl -n authentik get svc,deploy ak-outpost-stirling-pdf
kubectl -n stirling-pdf get middleware stirling-pdf-authentik
kubectl -n stirling-pdf get ingressroute stirling-pdf \
  -o jsonpath='{.spec.routes[0].middlewares}' ; echo

# Gatus-Config live
kubectl -n status get cm gatus -o jsonpath='{.data.config\.yaml}' \
  | grep -A8 'name: stirling-pdf'
```

Browser: Login als User mit `stirling_pdf_admins` / `stirling_pdf_users` → UI nach SSO.

### Abgrenzung

- Multipart / Jetty PREAMBLE / iOS-Upload: Kapitel **Uploads & OCR** — anderes Symptom (Upload-Fehler trotz erreichbarer App).
- Nach SSO: unauthentifizierte API-Calls (`curl -F …`) → **401/302**, kein PREAMBLE mehr als „Auth fehlt“-Signal; Boundary-Checks nur noch mit Session oder API-Key.
