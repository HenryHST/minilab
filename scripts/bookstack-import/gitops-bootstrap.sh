#!/bin/sh
# Upsert BookStack role/user/API token via artisan in the app pod.
# Requires: BOOKSTACK_TOKEN_ID, BOOKSTACK_TOKEN_SECRET, kubectl, /config/gitops-bootstrap.php
set -eu

NS="${STATE_NS:-bookstack}"
SCRIPT="${BOOTSTRAP_SCRIPT:-/config/gitops-bootstrap.php}"

if [ -z "${BOOKSTACK_TOKEN_ID:-}" ] || [ -z "${BOOKSTACK_TOKEN_SECRET:-}" ]; then
  echo "SKIP gitops-bootstrap: token secret not set"
  exit 0
fi

if [ ! -f "${SCRIPT}" ]; then
  echo "ERROR: ${SCRIPT} missing" >&2
  exit 1
fi

echo "Waiting for bookstack deployment..."
kubectl -n "${NS}" rollout status deploy/bookstack --timeout=180s

# Prefer Helm app labels (instance=bookstack). Job pods also carry name=bookstack and must not be selected.
POD="$(kubectl -n "${NS}" get pods \
  -l app.kubernetes.io/name=bookstack,app.kubernetes.io/instance=bookstack \
  --field-selector=status.phase=Running \
  -o jsonpath='{.items[0].metadata.name}')"
if [ -z "${POD}" ]; then
  echo "ERROR: no running bookstack app pod (name+instance=bookstack)" >&2
  exit 1
fi
echo "Bootstrap via pod/${POD}"

# Materialize (ConfigMap mounts are often symlinks; kubectl cp may not follow)
TMP="/tmp/gitops-bootstrap-$$.php"
cp -L "${SCRIPT}" "${TMP}"
kubectl -n "${NS}" cp "${TMP}" "${POD}:/tmp/gitops-bootstrap.php" -c bookstack
rm -f "${TMP}"

kubectl -n "${NS}" exec "${POD}" -c bookstack -- \
  env BOOKSTACK_TOKEN_ID="${BOOKSTACK_TOKEN_ID}" BOOKSTACK_TOKEN_SECRET="${BOOKSTACK_TOKEN_SECRET}" \
  sh -ceu 'cd /app/www && php artisan tinker --execute="require \"/tmp/gitops-bootstrap.php\";"'

kubectl -n "${NS}" exec "${POD}" -c bookstack -- rm -f /tmp/gitops-bootstrap.php || true
echo "OK: gitops-bootstrap finished"
