---
title: Quellen
book_version: "1.3.0"
---

# Quellen

## minilab

- App: [`apps/dev/vaultwarden/`](https://github.com/HenryHST/minilab/tree/main/apps/dev/vaultwarden)
- Chart-Fork: [`apps/dev/vaultwarden/charts/vaultwarden/`](https://github.com/HenryHST/minilab/tree/main/apps/dev/vaultwarden/charts/vaultwarden) (`1.4.2+minilab.1`)
- Site-Values / Manifest: `values.yaml`, `helm-manifest.yaml`
- Restore-UI Image: [`restore-ui/`](https://github.com/HenryHST/minilab/tree/main/apps/dev/vaultwarden/restore-ui) → `ghcr.io/henryhst/vw-restore`
- Pangolin Publish: [`apps/ops/pangolin-publish/`](https://github.com/HenryHST/minilab/tree/main/apps/ops/pangolin-publish)
- ADR-0014 Helm-Strategie: [`docs/adr/0014-helm-strategie.md`](../../../../adr/0014-helm-strategie.md)

### Archify

| Diagramm | Datei |
|----------|--------|
| Architektur | [`vaultwarden-architektur`](../../../diagrams/archify/vaultwarden-architektur.html) |
| Helm / GitOps | [`vaultwarden-helm-gitops`](../../../diagrams/archify/vaultwarden-helm-gitops.html) |
| Secrets & SMTP | [`vaultwarden-smtp-secrets`](../../../diagrams/archify/vaultwarden-smtp-secrets.html) |

- Buch Authentik — Kapitel *Externe Ressourcen mit Pangolin*, *Onboarding*
- Buch Minilab — *Apps & Hosts*, *Backup & Restore*
- Anleitung *Zugang & Passwörter*

## Infra_LAB

- Authentik TF: `terraform/authentik/modules/dev/authentik_vaultwarden.tf`, Stub `authentik_vw_restore.tf`
- Day-0 Blueprint: minilab `apps/ops/authentik/blueprints/day0-vw-restore.yaml`
- Kapitel *Pangolin Ext: BookStack & Vaultwarden* (Buch Infra_LAB)
- Secrets: `ansible/playbooks/k3s_cluster/secrets/` (`vaultwarden-oauth` / `-admin` / `-smtp`)
- k3s-README: Abschnitt Vaultwarden SSO + Pangolin ext
- ADR-0008 Pangolin Ownership
- Incident 2026-11-04 ImagePull-Kaskade (Kurz): [12-incident-2026-11-04-imagepull-cascade.md](12-incident-2026-11-04-imagepull-cascade.md)
- Incident 2026-11-04 ausführlich: Infra_LAB Authentik [13-incident-2026-11-04-idp-registry-cascade.md](https://github.com/HenryHST/Infra_LAB/blob/main/docs/bookstack/books/authentik/13-incident-2026-11-04-idp-registry-cascade.md)
- vw-restore Pull-Secret Ownership: Infra_LAB [k3s 11-vw-restore-image-pull](https://github.com/HenryHST/Infra_LAB/blob/main/docs/bookstack/books/k3s/11-vw-restore-image-pull.md)

## Upstream (historisch)

- Chart-Vorlage: [gissilabs/charts vaultwarden](https://github.com/gissilabs/charts/tree/master/vaultwarden) — nach dem Fork **kein** Runtime-Dependency
- [Vaultwarden Wiki](https://github.com/dani-garcia/vaultwarden/wiki)
- [SSO / OpenID Connect](https://github.com/dani-garcia/vaultwarden/wiki/Enabling-SSO-support-using-OpenId-Connect)
- [Emergency Access](https://bitwarden.com/help/emergency-access/)
- [Authentik + Vaultwarden](https://integrations.goauthentik.io/security/vaultwarden/)
