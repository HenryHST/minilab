---
title: Betrieb und Metrics
book_version: "1.3.0"
updated: "2026-10-28"
---

# Betrieb und Metrics

## Policy

- `ignoreUnfixed: true` — Noise ohne Fix reduzieren.
- Exclude nur System-Namespaces; App-Namespaces bleiben im Scope.
- Built-in Trivy-Server in `trivy-system` (Client/Server-Mode).

### RBAC: Kubernetes Bootstrapping überspringen

`trivyOperator.skipResourceByLabels: kubernetes.io/bootstrapping` — ClusterRoles/Roles mit Label `kubernetes.io/bootstrapping` (API-Server-Defaults: `system:controller:*`, `system:aggregate-to-*`, `cluster-admin` / `edit` / `admin`, …) werden nicht gescannt.

Beispiele, die vorher Headlamp-Noise waren: `system:controller:horizontal-pod-autoscaler` (AVD-KSV-0046), `system:aggregate-to-edit` (0041/0048/…). Nicht patchen — `rbac.authorization.kubernetes.io/autoupdate: true`. Chart-/Operator-Rollen ohne dieses Label bleiben im Scope (z. B. Argo CD, Longhorn).

### App-Findings (akzeptiert / gehärtet)

| App | Kurz | Details |
|-----|------|---------|
| **newt** | ConfigAudit: HIGH/LOW gehärtet; **AVD-KSV-0125** (docker.io) akzeptiert | Buch [Newt → Trivy ConfigAudit](../newt/03-trivy-config-audit.md) · Values `apps/ops/newt/values.yaml` |

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

- Versionen bumpen und verifizieren: [Upgrade](06-upgrade.md) (Chart-Pin + ggf. `trivy.image.tag`).
- CRDs bei Deinstall **nicht** blind löschen — löscht alle Reports (siehe Upstream Helm-Docs).
- Alerts sind nicht vordefiniert — bei Bedarf Rules analog `homelab-alerts` ergänzen.
