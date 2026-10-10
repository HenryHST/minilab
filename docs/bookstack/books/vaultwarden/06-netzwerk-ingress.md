---
title: Netzwerk und Ingress
book_version: "1.1.0"
---

# Netzwerk & Ingress

## NetworkPolicy

Ingress auf Port 80 nur aus:

- Namespace `vaultwarden` (in-ns)
- Namespace `traefik` (LAN IngressRoute)
- Namespace `newt` (Pangolin)

Egress ist offen (OIDC zu Authentik). Manifest: `networkpolicy.yaml`.

## IngressRoute (LAN)

- Host: `vaultwarden.stadthagen.dev`
- Middleware `sso-to-ext`: Redirect Regex → `https://vw-ext.stadthagen.dev/$1`
- TLS: Secret `vaultwarden-tls` (LAN-Hostname)

Öffentlicher Traffic kommt nicht über diese Route, sondern über Newt → Service.

## Headers

Middleware `default-headers` setzt u. a. `X-Forwarded-Proto: https` (wichtig für Secure-Cookies hinter Proxy).

Prüfen:

```bash
curl -sSI https://vaultwarden.stadthagen.dev/ | head -15
# Location: https://vw-ext.stadthagen.dev/...
```
