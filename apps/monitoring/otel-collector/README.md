# otel-collector

Minimal OpenTelemetry Collector for **RustFS** (pi7cl) metrics bridge.

- OTLP HTTP: `http://192.168.0.219:4318` (Cilium LoadBalancer)
- Prometheus scrape: `:8889/metrics` (ServiceMonitor → kube-prometheus-stack)
- RustFS: `RUSTFS_OBS_ENDPOINT=http://192.168.0.219:4318` (Ansible `henryhst.k3s.rustfs`)

No native RustFS `/metrics` — see [RustFS Observability](https://docs.rustfs.com/en/operations/observability).
