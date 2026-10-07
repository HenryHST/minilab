# ADR-0008: TLS via cert-manager und Hetzner DNS-01

- **Status:** Accepted
- **Datum:** 2026-09-11 (ergänzt 2026-10-07: Metrics/Grafana; 2026-10-07: domain-solver RBAC)
- **Kontext:** `apps/ops/cert-manager/`, App-`certificate.yaml`

## Kontext

Traefik IngressRoutes brauchen TLS. Manuelles Kopieren eines Wildcards (`stadthagen-tls` aus Namespace `traefik`) war fehleranfällig und nicht app-spezifisch rotierbar.

## Entscheidung

- **cert-manager** (Native Helm) mit Webhook **Hetzner DNS-01**.
- ClusterIssuer `letsencrypt-prod`.
- Pro App ein `Certificate`; TLS-Secret heißt `<app>-tls`.
- Secret `hetzner` im Namespace `certmanager` (Ansible Secrets).
- DNS A-Records für interne Traefik-Hosts zeigen auf Traefik LB (`192.168.0.215`).
- **Webhook chart vendored** under `apps/ops/cert-manager/webhook/` (Hetzner chart 0.9.0). ClusterRole `…:domain-solver` pins `resources: [hetzner]` (API group `acme.hetzner.com`) instead of `*` — clears Trivy AVD-KSV-0046; only ChallengePayload exists in that group. Re-apply the pin after chart bumps.
- **Metrics (2026-10-07):** Chart `prometheus.enabled` with **PodMonitor** (not ServiceMonitor) per [cert-manager Prometheus Metrics](https://cert-manager.io/docs/devops-tips/prometheus-metrics/). Label `release: kube-prometheus-stack` (live Prometheus selector). PodMonitor XOR ServiceMonitor.
- **Grafana:** Dashboard gnetId **20340** (Folder `cert-manager`) in kube-prometheus-stack — [Grafana.com](https://grafana.com/grafana/dashboards/20340-cert-manager/). Alert `CertificateExpiringSoon` in `homelab-alerts.yaml`.
- **Nicht:** Metrics-Endpoint-TLS, cert-manager-mixin (Jsonnet).
- **Trivy Builtin RBAC:** API-server bootstrapping roles (`kubernetes.io/bootstrapping`) are skipped cluster-wide via Trivy Operator `skipResourceByLabels` — see [Trivy Betrieb: Bootstrapping](../bookstack/books/trivy-operator/04-betrieb-metrics.md). Do not patch `system:aggregate-to-edit` / `system:controller:*`.

## Konsequenzen

- Kein manuelles Zertifikat-Kopieren mehr.
- Abhängigkeit: cert-manager + Webhook müssen vor abhängigen Certificates synced sein.
- Öffentliche Pangolin-Hosts terminieren TLS am Pangolin-Edge ([ADR-0011](0011-pangolin-public-exposure.md)), nicht zwingend über denselben Ingress-Pfad.
- Certificate-Ready/Expiry (inkl. Hybrid-TLS wie `authentik-pg-server`, [ADR-0033](0033-authentik-cnpg.md)) sind über Prometheus/Grafana sichtbar.
- Webhook is GitOps path-only (no remote `charts.hetzner.cloud` source); bump = re-vendor + keep domain-solver pin.
