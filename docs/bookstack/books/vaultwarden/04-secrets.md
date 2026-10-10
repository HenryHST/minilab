---
title: Secrets
book_version: "1.1.0"
---

# Secrets

Keine Secrets im Git. Source of Truth: Infra_LAB SecretSpec → Ansible `--tags secrets` → Kubernetes.

| SecretSpec | K8s Secret | Keys / Env |
|------------|------------|------------|
| `VAULTWARDEN_OAUTH_CLIENT_SECRET` | `vaultwarden/vaultwarden-oauth` | `SSO_CLIENT_SECRET` |
| `VAULTWARDEN_ADMIN_TOKEN` | `vaultwarden/vaultwarden-admin` | `ADMIN_TOKEN` (Admin-Panel) |

## Pin mit Terraform

1. Authentik-Client-Secret in `dev.secrets.tfvars` als `vaultwarden_oauth_client_secret` setzen (gleicher Wert wie SecretSpec).
2. `./scripts/reconcile.sh dev` bzw. `--tags authentik-bootstrap`.
3. `ansible-playbook … --tags secrets` — Secret im Cluster aktualisieren.
4. Vaultwarden-Pod neu starten / Rollout, falls Env schon geladen war.

Für Pangolin-Ext braucht es **keine** zusätzlichen SecretSpec-Keys — nur Redirects/`DOMAIN`.

Runbook: Infra_LAB `ansible/playbooks/k3s_cluster/secrets/README.md` und k3s-README Abschnitt *Vaultwarden SSO*.
