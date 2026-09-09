# Alert rule tests (planned)

Nach Auswahl des Alerting-Ansatzes hier `promtool test rules` Fixtures ablegen, z. B.:

```text
tests/
  baseline-workload_test.yaml
  baseline-node_test.yaml
```

Ausführung (lokal / CI):

```bash
promtool check rules ../manifests/homelab-alerts.yaml
promtool test rules ./*_test.yaml
```

Siehe auch [`../ALERTING.md`](../ALERTING.md) Abschnitt Testing.
