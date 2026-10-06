---
title: Architektur
book_version: "1.0.0"
---

# Architektur

Kyverno kommt per GitOps aus minilab: Helm-Release plus Extra-Source mit ClusterPolicies. Sync-Wave **0**, damit Policies früh existieren, bevor andere infra-Apps (Wave 1) syncen.

![Kyverno GitOps](https://raw.githubusercontent.com/HenryHST/minilab/main/docs/diagrams/archify/exports/kyverno-gitops.png)

Explorer: [kyverno-gitops.html](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/kyverno-gitops.html)

```mermaid
flowchart LR
  Git[apps/infra/kyverno] --> AS[ApplicationSet_infra]
  AS --> Helm[Helm_kyverno]
  AS --> Pol[policies/]
  Helm --> NS[NS_kyverno]
  Pol --> CP[ClusterPolicy]
```

### Komponenten (Chart)

| Controller | Aufgabe |
|------------|---------|
| Admission | Validating/Mutating Webhooks zur Apply-Zeit |
| Background | Periodische Re-Evaluation vorhandener Ressourcen |
| Reports | Schreibt PolicyReport / ClusterPolicyReport |
| Cleanup | Aufräumen (Chart-Default, 1 Replica) |

Values: [`apps/infra/kyverno/values.yaml`](../../../../apps/infra/kyverno/values.yaml) — Homelab mit je 1 Replica. Webhook-Namespace-Selector schließt `kube-system` und `kyverno` aus (zusätzlich zu Policy-Excludes).
