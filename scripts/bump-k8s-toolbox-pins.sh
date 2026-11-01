#!/usr/bin/env bash
# Bump k8s-toolbox image pins across minilab manifests from apps/ops/k8s-toolbox/VERSION.
# Usage: scripts/bump-k8s-toolbox-pins.sh [old_version]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VER="$(tr -d '[:space:]' < "${ROOT}/apps/ops/k8s-toolbox/VERSION")"
OLD="${1:-}"
if [ -z "${OLD}" ]; then
  # Detect previous pin from a known consumer
  OLD="$(rg -o 'ops/k8s-toolbox:\K[0-9]+\.[0-9]+\.[0-9]+' "${ROOT}/apps" -g '*.yaml' -g '*.yml' | sort -u | head -1 || true)"
fi
if [ -z "${OLD}" ] || [ "${OLD}" = "${VER}" ]; then
  echo "Nothing to bump (VERSION=${VER}, old='${OLD}')" >&2
  exit 0
fi

echo "Bumping k8s-toolbox ${OLD} → ${VER} (and ${OLD}-slim → ${VER}-slim)"

# Full tag replacements (avoid double-replacing -slim)
while IFS= read -r -d '' f; do
  perl -i -pe "s#ops/k8s-toolbox:${OLD}-slim#ops/k8s-toolbox:${VER}-slim#g; s#ops/k8s-toolbox:${OLD}([^-0-9a-zA-Z]|\$)#ops/k8s-toolbox:${VER}\$1#g" "$f"
done < <(find "${ROOT}/apps" \( -name '*.yaml' -o -name '*.yml' \) -print0)

echo "Done. Review: rg 'ops/k8s-toolbox:' apps -g '*.yaml'"
