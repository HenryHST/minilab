# Trivy Operator

Cluster vulnerability and configuration scanning (Aqua Trivy Operator). Complements Infra_LAB CI Trivy (GitHub Actions); this app watches live workloads.

| | |
|--|--|
| Argo | ApplicationSet `ops`, sync wave `1`, namespace `trivy-system` |
| Chart | `trivy-operator` **0.32.1** from `https://aquasecurity.github.io/helm-charts/` |
| Scan | All namespaces except `kube-system` and `trivy-system` |
| Policy | `trivy.ignoreUnfixed: true` (same idea as Infra_LAB CI) |
| Server | `operator.builtInTrivyServer: true` (Client/Server mode in-cluster) |
| Service | `headless: false` (ClusterIP) for ServiceMonitor scrape |
| Metrics | ServiceMonitor label `release: kube-prometheus-stack` |
| Grafana | Dashboard gnetId **17813** (folder Trivy) via kube-prometheus-stack |

## Private registries

Prefer workload `imagePullSecrets` (Aqua [private registries](https://aquasecurity.github.io/trivy-operator/latest/tutorials/private-registries/) option 2). The operator inherits them for scan jobs (`accessGlobalSecretsAndServiceAccount` default true). Do not commit credentials.

If a namespace has no pull secret on the workload, create a `kubernetes.io/dockerconfigjson` Secret out-of-band (see [`secret.example.yaml`](secret.example.yaml)) and map it with `operator.privateRegistryScanSecretsNames` in values when needed.

## Verify

```bash
kubectl -n argocd get application trivy-operator
kubectl -n trivy-system get deploy,sts,svc,servicemonitor,pods
kubectl get vulnerabilityreports -A | head
kubectl get configauditreports -A | head
# Grafana: folder Trivy → Trivy Operator Dashboard (17813)
```

ADR: [`docs/adr/0031-trivy-operator.md`](../../../docs/adr/0031-trivy-operator.md).  
BookStack: [`docs/bookstack/books/trivy-operator/`](../../../docs/bookstack/books/trivy-operator/).  
Archify: [`docs/diagrams/archify/trivy-architektur.html`](../../../docs/diagrams/archify/trivy-architektur.html).
