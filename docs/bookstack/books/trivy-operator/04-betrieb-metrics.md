---
title: Betrieb und Metrics
book_version: "1.1.0"
---

# Betrieb und Metrics

## Policy

- `ignoreUnfixed: true` — Noise ohne Fix reduzieren.
- Exclude nur System-Namespaces; App-Namespaces bleiben im Scope.
- Built-in Trivy-Server in `trivy-system` (Client/Server-Mode).

## Metrics

Operator-Metriken über ServiceMonitor (`service.headless: false`, Port 80). Targets in Prometheus prüfen (`release: kube-prometheus-stack`). Kein zusätzlicher static scrape job.

Beispiel-PromQL:

```promql
sum(trivy_image_vulnerabilities)
sum(trivy_resource_configaudits)
sum(trivy_image_exposedsecrets)
```

## Grafana

Folder **Trivy**, Dashboard gnetId **17813** (Revision 2), provisioniert über kube-prometheus-stack. Siehe [Aqua Grafana Tutorial](https://aquasecurity.github.io/trivy-operator/latest/tutorials/grafana-dashboard/).

## Private Registry

Primär: Workload-`imagePullSecrets` — der Operator erbt sie für Scan-Jobs ([Aqua private registries](https://aquasecurity.github.io/trivy-operator/latest/tutorials/private-registries/), Option 2). Credentials nie in Git.

Fallback ohne Pull-Secret am Workload: Secret out-of-band anlegen (Vorlage `apps/ops/trivy-operator/secret.example.yaml`) und `operator.privateRegistryScanSecretsNames` setzen.

## Pflege

- Chart-Pin in ApplicationSet bumpen (SemVer).
- CRDs bei Deinstall **nicht** blind löschen — löscht alle Reports (siehe Upstream Helm-Docs).
- Alerts sind nicht vordefiniert — bei Bedarf Rules analog `homelab-alerts` ergänzen.
