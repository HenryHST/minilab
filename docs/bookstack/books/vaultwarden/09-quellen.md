---
title: Quellen
book_version: "1.1.0"
---

# Quellen

## minilab

- Manifeste: [`apps/dev/vaultwarden/`](https://github.com/HenryHST/minilab/tree/main/apps/dev/vaultwarden)
- Pangolin Publish: [`apps/ops/pangolin-publish/`](https://github.com/HenryHST/minilab/tree/main/apps/ops/pangolin-publish)
- Buch Authentik — Kapitel *Externe Ressourcen mit Pangolin*, *Onboarding*
- Buch Minilab — *Apps & Hosts*, *Backup & Restore*
- Anleitung *Zugang & Passwörter*

## Infra_LAB

- Authentik TF: `terraform/authentik/modules/dev/authentik_vaultwarden.tf`, Stub `authentik_vw_restore.tf`
- Day-0 Blueprint: `apps/ops/authentik/blueprints/day0-vw-restore.yaml`
- Kapitel *Pangolin Ext: BookStack & Vaultwarden* (Buch Infra_LAB)
- Secrets: `ansible/playbooks/k3s_cluster/secrets/`
- k3s-README: Abschnitt Vaultwarden SSO + Pangolin ext
- ADR-0008 Pangolin Ownership

## Upstream

- [Vaultwarden Wiki](https://github.com/dani-garcia/vaultwarden/wiki)
- [SSO / OpenID Connect](https://github.com/dani-garcia/vaultwarden/wiki/Enabling-SSO-support-using-OpenId-Connect)
- [Authentik + Vaultwarden](https://integrations.goauthentik.io/security/vaultwarden/)
