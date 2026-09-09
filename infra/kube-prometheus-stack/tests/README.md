# Alert rule tests

Requires [`promtool`](https://prometheus.io/docs/prometheus/latest/command-line/promtool/) on PATH.

## Run

From this directory:

```bash
# Extract groups from the PrometheusRule CRD into a plain rules file
python3 - <<'PY'
import pathlib, yaml
src = pathlib.Path("../manifests/homelab-alerts.yaml")
doc = yaml.safe_load(src.read_text())
pathlib.Path("baseline-rules.yaml").write_text(
    yaml.safe_dump({"groups": doc["spec"]["groups"]}, sort_keys=False)
)
print("wrote baseline-rules.yaml")
PY

promtool check rules baseline-rules.yaml
promtool test rules baseline_test.yaml
```

Or use the helper script:

```bash
./run-tests.sh
```

## Coverage

| Alert | Fixture |
|-------|---------|
| DeploymentUnavailable | available=0, desired=1 for 6m |
| PodCrashLooping | CrashLoopBackOff for 11m |
| PVENodeDown | `pve_up{id=~node/.*}==0` for 3m |
| PVEStorageAlmostFull | storage usage 97% for 6m |

Loki LogQL rules (`infra/loki/manifests/loki-alerting-rules.yaml`) are not covered by promtool; validate after deploy via Loki ruler API / Alertmanager.

See [`../ALERTING.md`](../ALERTING.md).
