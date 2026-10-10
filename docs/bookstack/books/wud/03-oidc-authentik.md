---
title: OIDC mit Authentik
book_version: "1.0.0"
---

# OIDC mit Authentik

WUD nutzt seinen eigenen OIDC-Login (Anleitung: [How to integrate with Authentik](https://getwud.app/docs/configuration/authentications/oidc/#how-to-integrate-with-authentik)). Es gibt keine ForwardAuth-Middleware und keinen lokalen Admin.

## Authentik-Seite

| Einstellung | Wert |
|--|--|
| Provider-Typ | OAuth2/OpenID, Confidential |
| Client-ID | `wupd` |
| Client-Secret | gepinnt (`wupd_oauth_client_secret`) |
| Redirect-URI | `https://wupd.stadthagen.dev/auth/oidc/authentik/cb` (strict) |
| Scopes | `openid`, `email`, `profile` |
| Zugriff | Policy-Bindings auf `wupd_admins` und `wupd_users` |

Den Claim `groups` liefert in Authentik das Standard-Mapping für `profile`. Ein eigener `groups`-Scope ist nicht nötig. Deshalb setzt WUD `WUD_AUTH_OIDC_AUTHENTIK_SCOPE=openid email profile` und hängt `groups` nicht selbst an.

Terraform: `terraform/authentik/modules/dev/authentik_wupd.tf` (Infra_LAB).

## WUD-Seite

| Variable | Wert |
|--|--|
| `WUD_PUBLIC_URL` | `https://wupd.stadthagen.dev` |
| `WUD_AUTH_OIDC_AUTHENTIK_CLIENTID` | `wupd` |
| `WUD_AUTH_OIDC_AUTHENTIK_CLIENTSECRET` | aus `wud-env` |
| `WUD_AUTH_OIDC_AUTHENTIK_DISCOVERY` | `https://idp.stadthagen.dev/application/o/wupd/.well-known/openid-configuration` |
| `WUD_AUTH_OIDC_AUTHENTIK_REDIRECT` | `true` (keine WUD-Loginseite) |
| `WUD_AUTH_OIDC_AUTHENTIK_GROUPSCLAIM` | `groups` |
| `WUD_AUTH_OIDC_AUTHENTIK_ADMINGROUP` | `wupd_admins` |
| `WUD_AUTH_OIDC_AUTHENTIK_ROGROUP` | `wupd_users` |
| `WUD_AUTH_OIDC_AUTHENTIK_DEFAULTROLE` | `none` |

## Rollen

| Authentik-Gruppe | WUD-Rolle | Darf |
|--|--|--|
| `wupd_admins` | `admin` | alles, inkl. Trigger manuell auslösen und Benutzer verwalten |
| `wupd_users` | `ro` | nur ansehen |
| keine der beiden | — | Login wird abgewiesen |

WUD gleicht die Rolle bei jedem Login mit den Gruppen ab. Wer aus `wupd_admins` entfernt wird, ist beim nächsten Login kein Admin mehr.

Weil `ADMINGROUP` gesetzt ist, startet WUD ohne `WUD_AUTH_ADMIN_USER`/`_PASSWORD`. Fehlt das Client-Secret, kann sich niemand anmelden. Offen ist WUD dann trotzdem nicht.

## Fehlerbilder

| Symptom | Ursache |
|--|--|
| Authentik: „Redirect URI Error“ | Redirect in Authentik passt nicht exakt zu `…/auth/oidc/authentik/cb` |
| Nach dem Login zurück auf Login mit Fehlermeldung | Benutzer in keiner `wupd_*`-Gruppe (`DEFAULTROLE=none`) |
| `invalid_client` im WUD-Log | `WUD_OAUTH_CLIENT_SECRET` ≠ Terraform `wupd_oauth_client_secret` |
