---
title: Architektur
book: trivy-operator
book_version: "1.2.1"
chapter: architektur
chapter_version: "1.1.0"
updated: "2026-10-12"
---

# Architektur

> **Buch** v1.2.1 · **Kapitel** v1.1.0 · Stand: 2026-10-12

## Ownership

| | |
|--|--|
| ApplicationSet | `ops` |
| Sync-Wave | `1` |
| Namespace | `trivy-system` |
| Chart | `trivy-operator` 0.37.0 (`https://aquasecurity.github.io/helm-charts/`) |

## Scan-Scope

- Alle Namespaces, außer `kube-system` und `trivy-system` (`excludeNamespaces`).
- `trivy.ignoreUnfixed: true` — nur Findings mit Fix (wie Infra_LAB CI-Richtung).
- `operator.builtInTrivyServer: true` — Scan-Jobs nutzen den in-cluster Trivy-Server.

## Reports (CRDs)

Typische Arten: `VulnerabilityReport`, `ConfigAuditReport`, `ExposedSecretReport`, `RbacAssessmentReport`, `InfraAssessmentReport`, Compliance-/SBOM-Varianten (je nach Chart-Default). Hands-on: [Reports Walkthrough](05-reports-walkthrough.md).

## Observability

- ServiceMonitor mit Label `release: kube-prometheus-stack` (`service.headless: false`).
- Grafana-Folder **Trivy**, Dashboard gnetId **17813**.
