---
title: Übersicht
book_version: "1.1.1"
---

# Übersicht

Vaultwarden ist der Bitwarden-kompatible Passwort-Safe im nXk3-Cluster. Login läuft über Authentik-OIDC; Web-Vault und Clients nutzen den öffentlichen Host `vw-ext`.

| | |
|--|--|
| Argo App | `vaultwarden` (ApplicationSet `dev`, Wave 3, Plain-Manifeste) |
| Pfad | `apps/dev/vaultwarden/` |
| Image | `vaultwarden/server:1.37.2` |
| Namespace | `vaultwarden` |
| Node | `nxk3-w02` |
| URL (kanonisch) | https://vw-ext.stadthagen.dev |
| LAN-Alias | `https://vaultwarden.stadthagen.dev` → Redirect auf `vw-ext` |
| Login | Authentik-OIDC, Slug `vaultwarden` — Gruppen `vaultwarden_admins` / `vaultwarden_users` |
| Speicher | PVC `vaultwarden-data` 2Gi Longhorn RWO (`/data`) |
| Backup | CronJob 02:00 + 14:00 UTC → NFS, Retention 14 |
| Restore-UI | https://vw-restore.stadthagen.dev (`vaultwarden_admins`) |

## Ownership

| Concern | Owner |
|---------|--------|
| Workload-Manifeste (Deploy, Ingress, Backup) | minilab GitOps |
| OIDC-App, Redirects, Gruppen | Infra_LAB `terraform/authentik` |
| Secrets (`vaultwarden-oauth`, `vaultwarden-admin`) | Infra_LAB SecretSpec → Ansible `--tags secrets` |
| Pangolin Publish (`vw-ext`) | minilab `apps/ops/pangolin-publish` |

## Abgrenzung

- Kein ForwardAuth an Pangolin (`sso: false`) — die App macht OIDC selbst.
- BookStack behält LAN-Launch; Vaultwarden Web/SSO/Clients sind **nur** `vw-ext` (siehe [Hosts & DOMAIN](02-hosts-domain.md)).
- Endnutzer-Kurzguide: Anleitung **Zugang & Passwörter**.

Weiter: [OIDC](03-oidc-authentik.md) · [Betrieb](08-betrieb.md).
