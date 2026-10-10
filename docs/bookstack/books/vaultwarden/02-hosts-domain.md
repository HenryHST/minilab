---
title: Hosts und DOMAIN
book_version: "1.0.0"
---

# Hosts & DOMAIN

Vaultwarden baut OIDC-Callback und API-URLs aus der Env `DOMAIN` — nicht aus dem Request-Host.

| Host | Rolle |
|------|--------|
| `https://vw-ext.stadthagen.dev` | Kanonisch: `DOMAIN`, Web-Vault, SSO, Bitwarden-Clients |
| `https://vaultwarden.stadthagen.dev` | Traefik-LAN; Middleware leitet **alles** nach `vw-ext` um |

In `deployment.yaml`:

```yaml
DOMAIN: https://vw-ext.stadthagen.dev
```

## Warum ein Host

1. **SSO-Binding-Cookie** (`VW_SSO_BINDING`) ist host-gebunden. Authorize auf LAN + Callback auf `vw-ext` → `SSO session binding mismatch`.
2. **CSP** der Web-Vault: `connect-src 'self'`. `/api/config` liefert Vault/API-URLs von `DOMAIN`. UI auf LAN + APIs auf `vw-ext` → Browser „Failed to fetch“.

Deshalb: Authentik-Launch = `vw-ext`, Clients = `vw-ext`, LAN nur noch Redirect.

## Clients

In Bitwarden-Apps / Browser-Extensions die Server-URL auf `https://vw-ext.stadthagen.dev` setzen (nicht die LAN-URL).

Details Pangolin: [Pangolin Publish](05-pangolin-publish.md). Infra_LAB-Buch: Kapitel *Pangolin Ext: BookStack & Vaultwarden*.
