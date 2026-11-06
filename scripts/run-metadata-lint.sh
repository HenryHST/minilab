#!/usr/bin/env bash
# Run metadata label/annotation lint for minilab apps/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PYTHONPATH="$ROOT/scripts${PYTHONPATH:+:$PYTHONPATH}"
python3 scripts/test_metadata_lint.py
python3 scripts/metadata_lint.py --root "$ROOT"
