# Grafana Loki (minilab)

Monolithic Loki with filesystem storage (PVC `loki-data` on `nxk3-w01`).

## Alerting (Ruler)

`values.yaml` enables the ruler and rules sidecar. ConfigMaps labeled
`loki_rule: "true"` with annotation `loki_ruler_tenant: fake` are mounted under
`/rules/fake` and evaluated against Alertmanager:

`http://kube-prometheus-stack-alertmanager.monitoring.svc.cluster.local:9093`

Baseline syslog rules: [`manifests/loki-alerting-rules.yaml`](manifests/loki-alerting-rules.yaml).

Full design: [`../kube-prometheus-stack/ALERTING.md`](../kube-prometheus-stack/ALERTING.md).
