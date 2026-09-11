# ADR-0010: Authentik als zentrales IdP

- **Status:** Accepted
- **Datum:** 2026-09-11
- **Kontext:** Application `authentik`, OIDC/OAuth in Termix, Vaultwarden, Grafana, …

## Kontext

Mehrere Apps brauchen Login. Getrennte lokale User-Datenbanken skalieren schlecht und erschweren Offboarding. Ein bestehender Authentik-Stack im Homelab soll als IdP dienen.

## Entscheidung

- **Authentik** ist das zentrale Identity Provider für SSO (OIDC/OAuth / ForwardAuth wo vorbereitet).
- Öffentlicher IdP-Einstieg: `idp.stadthagen.dev` über Pangolin → Authentik ClusterIP ([ADR-0011](0011-pangolin-public-exposure.md)).
- Apps behalten wo sinnvoll lokalen Admin-Login parallel (Beispiel Grafana: `oauth_auto_login: false`).
- Rollen über Authentik-Gruppen (z. B. Grafana Admins / Editors).
- Client-Secrets liegen nicht in Git (SecretSpecs / Ansible).

## Konsequenzen

- Neue geschützte Apps integrieren Authentik statt eigener IdP-Inseln.
- IdP-Ausfall betrifft SSO-Logins; lokale Break-Glass-Accounts wo vorgesehen behalten.
- ForwardAuth für z. B. registry-ui ist vorbereitet, aber app-spezifisch zu aktivieren.
