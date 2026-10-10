---
title: Pangolin Publish
book_version: "1.0.0"
---

# Pangolin Publish (`vw-ext`)

Öffentlicher Zugang über Pangolin Newt, ohne Platform-SSO an der Edge.

| | |
|--|--|
| App-Key | `vaultwarden` in `pangolin-publish` |
| Public Host | `vw-ext.stadthagen.dev` |
| Target | `vaultwarden.vaultwarden.svc.cluster.local:80` |
| Pangolin SSO | `false` (App-OIDC) |
| DNS A | Pangolin-Public-IP (GitOps, nicht Terraform `dns_records`) |

Allowlist: Infra_LAB `terraform/pangolin/docs/gitops-owned-resources.txt`. **Nicht** `vw-ext` in OpenTofu Pangolin-`resources`/`dns_records` eintragen (Dual-Write vermeiden).

## Teardown

Vor Cluster-Wipe: Ansible `pangolin-teardown-publish.sh` / `reset.yaml` — Defaults enthalten `vw-ext` und Legacy `vaultwarden-ext`.

## Rename

Früher: `vaultwarden-ext` → jetzt **`vw-ext`**. Alte Pangolin-Ressourcen + Hetzner-A-Records nach Sync einmal aufräumen.

Cross-Link: Authentik-Buch Kapitel *Externe Ressourcen mit Pangolin*; Infra_LAB Kapitel *Pangolin Ext: BookStack & Vaultwarden*.
