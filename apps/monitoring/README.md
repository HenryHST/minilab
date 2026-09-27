# apps/monitoring

Metrics, logs, and status tooling.

| App | Sync wave | Namespace | Application name |
|-----|-----------|-----------|------------------|
| metrics-server | 0 | kube-system | metrics-server |
| kube-prometheus-stack | 1 | monitoring | kube-prometheus-stack |
| grafana-loki | 3 | monitoring | grafana-loki |
| alloy | 3 | alloy | alloy |
| status | 3 | uptimekuma | status |
| unpoller | 2 | unpoller | unifipoller |
| kromgo | 3 | kromgo | kromgo |

Managed by ApplicationSet `monitoring` / AppProject `monitoring`. See [ADR-0022](../../docs/adr/0022-apps-bucket-applicationsets.md).
