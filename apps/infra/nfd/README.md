# Node Feature Discovery (NFD)

Detects hardware and software features on each node and publishes them as Kubernetes labels (`feature.node.kubernetes.io/*`).

- Chart: [node-feature-discovery 0.19.0](https://kubernetes-sigs.github.io/node-feature-discovery/v0.19/deployment/helm.html) (`oci://registry.k8s.io/nfd/charts`)
- Argo: ApplicationSet `infra` → app `nfd`, sync wave `1`, namespace `node-feature-discovery`
- Metrics: `prometheus.enable: true` → PodMonitors (scraped by kube-prometheus-stack)

## Verify

```bash
kubectl -n argocd get application nfd
kubectl -n node-feature-discovery get pods,podmonitor
kubectl get nodes -o json | jq -r '
  .items[] | .metadata.name as $n |
  (.metadata.labels // {}) | to_entries[] |
  select(.key | startswith("feature.node.kubernetes.io")) |
  "\($n)\t\(.key)=\(.value)"
' | head -40
```

ADR: [`docs/adr/0025-nfd.md`](../../docs/adr/0025-nfd.md).
