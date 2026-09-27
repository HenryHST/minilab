# ADR-0021: ByteStash mit Authentik-OIDC

- **Status:** Accepted
- **Datum:** 2026-09-27
- **Kontext:** `apps/dev/bytestash/`, Issue [HenryHST/minilab#69](https://github.com/HenryHST/minilab/issues/69)

## Kontext

Homelab braucht einen selbstgehosteten Snippet-Store mit SSO; ByteStash bietet native OIDC und SQLite unter `/data/snippets`.

## Entscheidung

- **Ownership:** GitOps Wave 3 plain Application (`apps/dev/bytestash`), nicht ApplicationSet.
- **Host:** `bytestash.stadthagen.dev` → Traefik LB `192.168.0.215` (LAN-only).
- **Auth:** native OIDC gegen Authentik (Redirect `/api/auth/oidc/callback`); keine ForwardAuth.
- **Secrets:** `BYTESTASH_OAUTH_CLIENT_SECRET` + `BYTESTASH_JWT_SECRET` via SecretSpec (nicht in Git).
- **Storage:** PVC Longhorn → `/data/snippets`; Image-Pin `ghcr.io/jordan-dalby/bytestash:1.5.12`.

```mermaid
flowchart LR
  User --> Traefik
  Traefik -->|"TLS bytestash-tls"| Svc
  Svc --> Pod["bytestash"]
  PVC["PVC snippets"] --> Pod
  Pod -->|"OIDC"| IdP["Authentik"]
```

## Konsequenzen

- Terraform `bytestash_oauth` + SecretSpec müssen denselben Client-Secret teilen.
- Interne Accounts deaktiviert (`DISABLE_INTERNAL_ACCOUNTS`); Admin via `ADMIN_USERNAMES`.
