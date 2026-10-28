# newt

Pangolin **Newt** site tunnel on nXk3 (Helm chart `fossorial/newt`).

| | |
|--|--|
| Argo | ApplicationSet **ops** → app `newt`, namespace `newt`, wave **0** |
| Values | [`values.yaml`](values.yaml) |
| Auth Secret | `newt-main-tunnel-auth` (Infra_LAB SecretSpec → `site.yaml --tags secrets`) |
| Docs | BookStack [`docs/bookstack/books/newt/`](../../../docs/bookstack/books/newt/) |

Image tag is pinned ahead of chart `appVersion`. Pod/container securityContext notes and Trivy ConfigAudit residuals: [03-trivy-config-audit.md](../../../docs/bookstack/books/newt/03-trivy-config-audit.md).
