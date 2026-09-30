---
title: OpenTofu
book_version: "1.1.0"
---

# OpenTofu

Die IdP-Objekte liegen in Infra_LAB unter `terraform/authentik`. Der Apply läuft über Ansible `--tags authentik-bootstrap`. Secrets stehen nicht im State-Text und nicht im Git.

## Was OpenTofu hält

| Objekt | Beispiel |
|--|--|
| OAuth2/OIDC-Application und Provider | Modul `oauth_app`, Termix in `modules/shared/authentik_termix.tf` |
| Gruppen und Policy-Bindings | `Termix Admins`, `Termix Users` |
| Flows | `registrierung`, `passwort-zuruecksetzen` |
| Brand | Modul `modules/brand`, Default-Brand |

Scope-Mappings bei Termix: `openid`, `email`, `profile`. Der Gruppen-Claim kommt aus dem Profile-Mapping.

## Was nicht in OpenTofu liegt

| | Eigentümer |
|--|--|
| Helm-Release, Ingress, PVC, Backup-Cron | GitOps `apps/ops/authentik` |
| Client-Secrets und Bootstrap-Passwort | SecretSpec + Ansible `--tags secrets` |
| Day-0-Objekte, die der Cluster sofort braucht | Blueprints in `apps/ops/authentik/blueprints` |
| Öffentliche Hosts auf Site `k3s` | `pangolin-publish` (Kapitel **Externe Ressourcen mit Pangolin**) |

## Modulmuster

Neue native OIDC-App: Datei unter `modules/shared/` oder dem passenden Env-Modul, Aufruf von `oauth_app`.

1. `name`, `slug`, `meta_launch_url` = App-URL.
2. `allowed_redirect_uris` mit `matching_mode: strict`. Sie müssen mit `meta_launch_url` beginnen. Der Check `redirect_uri_matches_meta_launch_url` bricht sonst ab.
3. `client_secret` aus der Variable, die Ansible aus der SecretSpec füllt.
4. Gruppen und `authentik_policy_binding` an die Application.
5. Apply mit `--tags authentik-bootstrap`. Danach die App in Argo auf denselben Issuer zeigen: `https://idp.stadthagen.dev/application/o/<slug>/`.

ForwardAuth-Apps wie registry-ui haben oft kein OpenTofu-Modul. Provider und Outpost stehen dann in Authentik bzw. in Day-0-Blueprints. Die Traefik-Middleware bleibt in GitOps.

## Betrieb

- README und Skripte: Infra_LAB `terraform/authentik/README.md`, Reconcile `scripts/reconcile.sh`.
- ADR: [0010-authentik-idp](../../../adr/0010-authentik-idp.md).
- Keine Client-Secrets oder Bootstrap-Passwörter in Ausgaben oder Commits.
