# traefik-manager — Traefik Manager 1.15.4

Central [Traefik Manager](https://github.com/chr0nzz/traefik-manager) UI for the lab, published at `https://traefik.stadthagen.dev` via nXk3 Traefik (Cilium VIP `.215`).

| | |
|---|---|
| Namespace | `traefik-manager` |
| URL | `https://traefik.stadthagen.dev` |
| Image | `ghcr.io/chr0nzz/traefik-manager:1.15.4` (digest-pinned) |
| Auth | App-native OIDC → Authentik provider `traefik-manager`; group `traefik_manager_admins` |
| Storage | PVC `traefik-manager-config` → `/app/config`; PVC `traefik-manager-backups` → `/app/backups` |
| Sync wave | `3` (ApplicationSet `ops`) |

## Prerequisites (Infra_LAB)

1. Terraform `terraform/authentik`: provider/app `traefik-manager`, redirect `https://traefik.stadthagen.dev/auth/oidc/callback`, pinned `traefik_manager_oauth_client_secret`, henry in `traefik_manager_admins`.
2. SecretSpec: `TRAEFIK_MANAGER_OAUTH_CLIENT_SECRET` (same value as TF pin).
3. `ansible-playbook site.yaml --tags secrets` → Secret `traefik-manager-oauth` (`client-secret`).
4. UniFi DNS `traefik` → `use_traefik_lb = true` (→ `192.168.0.215`).

Without Secret `traefik-manager-oauth` the pod stays in `CreateContainerConfigError`.

## Out of scope (this iteration)

- Multi-server Traefik Manager agents on Docker hosts
- Managing k3s Traefik CRDs as a file target
- Replacing host dashboards (`traefik1` / `traefik3` / `traefik5`) or legacy `tm-manager.stadthagen.dev`
