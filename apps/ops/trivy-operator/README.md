# Trivy Operator

Cluster vulnerability and configuration scanning (Aqua Trivy Operator). Complements Infra_LAB CI Trivy (GitHub Actions); this app watches live workloads.

| | |
|--|--|
| Argo | ApplicationSet `ops`, sync wave `1`, namespace `trivy-system` |
| Chart | `trivy-operator` **0.32.1** from `https://aquasecurity.github.io/helm-charts/` |
| Scan | All namespaces except `kube-system` and `trivy-system` |
| Policy | `trivy.ignoreUnfixed: true` (same idea as Infra_LAB CI) |
| Metrics | ServiceMonitor label `release: kube-prometheus-stack` |

## Verify

```bash
kubectl -n argocd get application trivy-operator
kubectl -n trivy-system get deploy,pods,servicemonitor
kubectl get vulnerabilityreports -A | head
kubectl get configauditreports -A | head
```

ADR: [`docs/adr/0031-trivy-operator.md`](../../../docs/adr/0031-trivy-operator.md).  
BookStack: [`docs/bookstack/books/trivy-operator/`](../../../docs/bookstack/books/trivy-operator/).  
Archify: [`docs/diagrams/archify/trivy-architektur.html`](../../../docs/diagrams/archify/trivy-architektur.html).
