---
title: OIDC mit Authentik
book_version: "1.0.0"
---

# OIDC mit Authentik

Vaultwarden nutzt eingebautes OIDC (`SSO_ENABLED=true`). Kein Traefik-ForwardAuth.

## Authentik-Seite

| Einstellung | Wert |
|--|--|
| Provider | OAuth2/OpenID, Confidential |
| Client-ID | `vaultwarden` |
| Client-Secret | gepinnt (`vaultwarden_oauth_client_secret`) |
| Redirect-URI | `https://vw-ext.stadthagen.dev/identity/connect/oidc-signin` (strict; LAN-URI zusätzlich erlaubt) |
| Launch-URL | `https://vw-ext.stadthagen.dev` |
| Scopes | `openid`, `email`, `profile`, `offline_access` |
| Zugriff | Policy-Bindings `vaultwarden_admins`, `vaultwarden_users` |

Terraform: Infra_LAB `terraform/authentik/modules/dev/authentik_vaultwarden.tf`.

### email_verified

Authentik 2025.10+ setzt im Default-Email-Scope oft `email_verified=false`. Vaultwarden lehnt das ab. Es gibt ein eigenes Scope-Mapping „Vaultwarden Email Scope“ mit `email_verified: True`.

## Vaultwarden-Seite

| Variable | Wert |
|--|--|
| `SSO_ENABLED` | `true` |
| `SSO_AUTHORITY` | `https://idp.stadthagen.dev/application/o/vaultwarden/` |
| `SSO_CLIENT_ID` | `vaultwarden` |
| `SSO_CLIENT_SECRET` | Secret `vaultwarden-oauth` |
| `SSO_SCOPES` | `openid email profile offline_access` |
| `SSO_SIGNUPS_MATCH_EMAIL` | `true` |
| `SSO_ALLOW_UNKNOWN_EMAIL_VERIFICATION` | `false` |
| `SIGNUPS_ALLOWED` | `false` |
| `INVITATIONS_ALLOWED` | `true` |

## Gruppen

| Authentik-Gruppe | Bedeutung |
|--|--|
| `vaultwarden_admins` | Admin-Rechte in Vaultwarden (u. a. henry) |
| `vaultwarden_users` | Normale Nutzer (Familie u. a.) |

Mitgliedschaft: Infra_LAB `access_control_users.tf`.

## Typische Fehler

| Symptom | Ursache |
|---------|---------|
| `SSO session binding mismatch` | Login über falschen Host (nicht `vw-ext`) oder alte Cookies |
| Login nach IdP bricht ab | Redirect-URI / `DOMAIN` stimmen nicht |
| Account wird abgelehnt | `email_verified` / Custom-Scope fehlt |

Siehe [Betrieb](08-betrieb.md).
