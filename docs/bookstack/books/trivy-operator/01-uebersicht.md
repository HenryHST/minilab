---
title: Übersicht
book_version: "1.1.0"
---

# Übersicht

Der **Trivy Operator** scannt laufende Workloads im nXk3-Cluster und schreibt Findings als Kubernetes-CRDs (`VulnerabilityReport`, `ConfigAuditReport`, …). Das ergänzt das CI-Trivy in Infra_LAB (GitHub Actions als Merge-Gate) — der Operator ist Transparenz im Cluster, kein Git-Blocker.

Ab v1.1.0: built-in Trivy-Server, ClusterIP-Service für Metrics, Grafana-Dashboard 17813.

![Trivy Operator Architektur](https://raw.githubusercontent.com/HenryHST/minilab/main/docs/diagrams/archify/exports/trivy-architektur.png)

Explorer: [trivy-architektur.html](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/trivy-architektur.html)

```mermaid
flowchart LR
  Argo[ApplicationSet_ops] --> Chart[trivy-operator_Helm]
  Chart --> Op[Operator]
  Chart --> Srv[builtIn_TrivyServer]
  Op --> CRs[Reports_CRDs]
  Op --> SM[ServiceMonitor]
  SM --> Prom[Prometheus]
  Prom --> Graf[Grafana_17813]
  CI[Infra_LAB_CI] -.-> Op
```
