---
title: Architektur
book_version: "1.1.0"
---

# Architektur

## Ownership

| | |
|--|--|
| ApplicationSet | `ops` |
| Sync-Wave | `1` |
| Namespace | `trivy-system` |
| Chart | `trivy-operator` 0.32.1 (`https://aquasecurity.github.io/helm-charts/`) |

## Scan-Scope

- Alle Namespaces, außer `kube-system` und `trivy-system` (`excludeNamespaces`).
- `trivy.ignoreUnfixed: true` — nur Findings mit Fix (wie Infra_LAB CI-Richtung).
- `operator.builtInTrivyServer: true` — Scan-Jobs nutzen den in-cluster Trivy-Server.

## Reports (CRDs)

Typische Arten: `VulnerabilityReport`, `ConfigAuditReport`, `ExposedSecretReport`, `RbacAssessmentReport`, `InfraAssessmentReport`, Compliance-/SBOM-Varianten (je nach Chart-Default).

## Observability

- ServiceMonitor mit Label `release: kube-prometheus-stack` (`service.headless: false`).
- Grafana-Folder **Trivy**, Dashboard gnetId **17813**.
