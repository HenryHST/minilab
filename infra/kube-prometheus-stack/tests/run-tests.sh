#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v promtool >/dev/null 2>&1; then
  echo "promtool not found on PATH" >&2
  exit 1
fi

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
echo "OK"
