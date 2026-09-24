# Authentik / SSO

Authentik ist das zentrale IdP (`https://idp.stadthagen.dev`).

## Integrierte Apps (Beispiele)

- Termix, Vaultwarden, Grafana, Headlamp, **BookStack**
- Client-Secrets liegen **nicht** in Git (SecretSpecs / Ansible)

## BookStack

- Methode: OIDC
- Issuer: `https://idp.stadthagen.dev/application/o/bookstack/`
- Redirect: `https://book.stadthagen.dev/oidc/callback`
- Gruppen → BookStack-Rollen (optional): z. B. `BookStack Admin`, `BookStack Editor`

Details: ADR-0010, App-README `apps/bookstack/README.md`.
