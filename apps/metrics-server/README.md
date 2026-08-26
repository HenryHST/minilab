# metrics-server

Provides `metrics.k8s.io` (pod/node resource metrics) for HPA and `kubectl top`.

k3s keeps the **bundled** metrics-server disabled; this app installs the official Helm chart instead.

- Chart: [metrics-server 3.13.1](https://artifacthub.io/packages/helm/metrics-server/metrics-server)
- Flag: `--kubelet-insecure-tls` (required on k3s)
- Namespace: `kube-system`, pinned to `worker=true`
