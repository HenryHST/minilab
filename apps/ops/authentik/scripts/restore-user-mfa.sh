#!/usr/bin/env bash
# Selective MFA restore: TOTP + WebAuthn devices for one user from a backup
# archive into the live Authentik Postgres (no full IdP overwrite).
#
# Usage:
#   ./restore-user-mfa.sh <archive|latest> <username|email> [nfs|s3|auto] --i-know-secret-key-matches
#
# Default conflict strategy: REPLACE existing TOTP/WebAuthn rows for that live user.
# Requires: kubectl → nXk3, aws CLI (for s3), python3, psql client;
#           secrets authentik-credentials + authentik-backup-s3.
set -euo pipefail

NS="${NS:-authentik}"
ARCHIVE_ARG="${1:-}"
USER_ARG="${2:-}"
SOURCE="${3:-auto}"
CONFIRM_FLAG="${4:-}"

usage() {
  echo "Usage: $0 <archive|latest> <username|email> [nfs|s3|auto] --i-know-secret-key-matches" >&2
  exit 1
}

[[ -n "${ARCHIVE_ARG}" && -n "${USER_ARG}" ]] || usage

if [[ "${SOURCE}" == "--i-know-secret-key-matches" ]]; then
  CONFIRM_FLAG="${SOURCE}"
  SOURCE="auto"
fi
if [[ "${CONFIRM_FLAG}" != "--i-know-secret-key-matches" ]]; then
  cat <<'EOF' >&2
SECRET_KEY guard: TOTP/WebAuthn device payloads are only usable if the live
AUTHENTIK_SECRET_KEY matches the key at backup time. Rotating the key after
the backup makes MFA from that archive unusable.

Re-run with --i-know-secret-key-matches as the last argument to proceed.
EOF
  exit 2
fi

for bin in kubectl aws python3 psql; do
  command -v "${bin}" >/dev/null || { echo "missing dependency: ${bin}" >&2; exit 1; }
done

WORKDIR="$(mktemp -d)"
trap 'rm -rf "${WORKDIR}"; kubectl -n "${NS}" delete pod "${POD:-}" --ignore-not-found --wait=false 2>/dev/null || true' EXIT

PGPASSWORD="$(kubectl -n "${NS}" get secret authentik-credentials -o jsonpath='{.data.password}' | base64 -d)"
export PGPASSWORD PGSSLMODE=require
PGHOST="$(kubectl -n "${NS}" get svc authentik-pg-rw -o jsonpath='{.spec.clusterIP}')"
PGUSER=authentik
PGDATABASE=authentik
export PGHOST PGUSER PGDATABASE

S3_ENDPOINT="$(kubectl -n "${NS}" get secret authentik-backup-s3 -o jsonpath='{.data.AWS_ENDPOINT_URL}' | base64 -d)"
S3_BUCKET="$(kubectl -n "${NS}" get secret authentik-backup-s3 -o jsonpath='{.data.S3_BUCKET}' | base64 -d)"
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID="$(kubectl -n "${NS}" get secret authentik-backup-s3 -o jsonpath='{.data.AWS_ACCESS_KEY_ID}' | base64 -d)"
AWS_SECRET_ACCESS_KEY="$(kubectl -n "${NS}" get secret authentik-backup-s3 -o jsonpath='{.data.AWS_SECRET_ACCESS_KEY}' | base64 -d)"
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

nfs_list_latest() {
  local p="authentik-mfa-ls-$$"
  kubectl -n "${NS}" delete pod "${p}" --ignore-not-found --wait=true 2>/dev/null || true
  cat <<EOF | kubectl -n "${NS}" apply -f - >/dev/null
apiVersion: v1
kind: Pod
metadata:
  name: ${p}
spec:
  restartPolicy: Never
  containers:
    - name: ls
      image: alpine:3.20
      command: ["sh", "-c", "ls -1t /backup/authentik-*.tar.gz 2>/dev/null | head -n1"]
      volumeMounts:
        - name: b
          mountPath: /backup
  volumes:
    - name: b
      persistentVolumeClaim:
        claimName: authentik-backups
EOF
  kubectl -n "${NS}" wait --for=jsonpath='{.status.phase}'=Succeeded "pod/${p}" --timeout=60s >/dev/null
  kubectl -n "${NS}" logs "${p}" | tr -d '\r' | tail -n1
  kubectl -n "${NS}" delete pod "${p}" --wait=true >/dev/null
}

nfs_fetch() {
  local remote_path="$1" dest="$2"
  local p="authentik-mfa-cp-$$"
  kubectl -n "${NS}" delete pod "${p}" --ignore-not-found --wait=true 2>/dev/null || true
  cat <<EOF | kubectl -n "${NS}" apply -f - >/dev/null
apiVersion: v1
kind: Pod
metadata:
  name: ${p}
spec:
  restartPolicy: Never
  containers:
    - name: cp
      image: alpine:3.20
      command: ["sleep", "300"]
      volumeMounts:
        - name: b
          mountPath: /backup
  volumes:
    - name: b
      persistentVolumeClaim:
        claimName: authentik-backups
EOF
  kubectl -n "${NS}" wait --for=condition=Ready "pod/${p}" --timeout=60s >/dev/null
  kubectl -n "${NS}" exec "${p}" -- cat "${remote_path}" > "${dest}"
  kubectl -n "${NS}" delete pod "${p}" --wait=true >/dev/null
}

s3_latest_key() {
  aws --endpoint-url "${S3_ENDPOINT}" s3 ls "s3://${S3_BUCKET}/" \
    | awk '{print $4}' | grep -E '^authentik-.*\.tar\.gz$' | sort -r | head -n1
}

ARCHIVE_FILE="${WORKDIR}/archive.tar.gz"
echo "Resolving archive (requested source=${SOURCE})..."

if [[ "${SOURCE}" == "auto" ]]; then
  if latest="$(nfs_list_latest 2>/dev/null)" && [[ -n "${latest}" ]]; then
    SOURCE=nfs
    ARCHIVE_ARG="$(basename "${latest}")"
    echo "auto → NFS ${ARCHIVE_ARG}"
  else
    SOURCE=s3
    echo "auto → S3 (NFS miss)"
  fi
fi

case "${SOURCE}" in
  nfs)
    if [[ "${ARCHIVE_ARG}" == "latest" ]]; then
      ARCHIVE_ARG="$(basename "$(nfs_list_latest)")"
    fi
    echo "Fetching NFS /backup/${ARCHIVE_ARG}..."
    nfs_fetch "/backup/${ARCHIVE_ARG}" "${ARCHIVE_FILE}"
    ;;
  s3)
    key="${ARCHIVE_ARG}"
    if [[ "${ARCHIVE_ARG}" == "latest" ]]; then
      key="$(s3_latest_key)"
    fi
    [[ -n "${key}" ]] || { echo "S3 object not found" >&2; exit 1; }
    echo "Downloading s3://${S3_BUCKET}/${key}..."
    aws configure set default.s3.addressing_style path
    aws --endpoint-url "${S3_ENDPOINT}" s3 cp "s3://${S3_BUCKET}/${key}" "${ARCHIVE_FILE}"
    ;;
  *)
    echo "Unknown source=${SOURCE}" >&2
    exit 1
    ;;
esac

[[ -s "${ARCHIVE_FILE}" ]] || { echo "Empty archive" >&2; exit 1; }
tar xzf "${ARCHIVE_FILE}" -C "${WORKDIR}"
[[ -f "${WORKDIR}/db.sql.gz" ]] || { echo "db.sql.gz missing in archive" >&2; exit 1; }

POD="authentik-mfa-tmp-$$"
echo "Starting ephemeral Postgres ${POD}..."
kubectl -n "${NS}" delete pod "${POD}" --ignore-not-found --wait=true 2>/dev/null || true
cat <<EOF | kubectl -n "${NS}" apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: ${POD}
  namespace: ${NS}
spec:
  restartPolicy: Never
  containers:
    - name: pg
      image: postgres:17-alpine
      env:
        - name: POSTGRES_PASSWORD
          value: tmp
        - name: POSTGRES_USER
          value: authentik
        - name: POSTGRES_DB
          value: authentik
EOF
kubectl -n "${NS}" wait --for=condition=Ready "pod/${POD}" --timeout=120s
for i in $(seq 1 60); do
  kubectl -n "${NS}" exec "${POD}" -- pg_isready -U authentik -d authentik -q && break
  sleep 2
done
kubectl -n "${NS}" cp "${WORKDIR}/db.sql.gz" "${NS}/${POD}:/tmp/db.sql.gz"
echo "Importing backup dump (temp)..."
kubectl -n "${NS}" exec "${POD}" -- sh -c 'gunzip -c /tmp/db.sql.gz | psql -U authentik -d authentik -v ON_ERROR_STOP=1' >/dev/null

BACKUP_UID="$(kubectl -n "${NS}" exec "${POD}" -- \
  psql -U authentik -d authentik -Atc \
  "SELECT id FROM authentik_core_user WHERE username='${USER_ARG}' OR email='${USER_ARG}' LIMIT 1;")"
BACKUP_UID="$(echo "${BACKUP_UID}" | tr -d '[:space:]')"
[[ -n "${BACKUP_UID}" ]] || { echo "User '${USER_ARG}' not found in backup dump" >&2; exit 1; }

LIVE_UID="$(psql -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}" -Atc \
  "SELECT id FROM authentik_core_user WHERE username='${USER_ARG}' OR email='${USER_ARG}' LIMIT 1;")"
LIVE_UID="$(echo "${LIVE_UID}" | tr -d '[:space:]')"
[[ -n "${LIVE_UID}" ]] || { echo "User '${USER_ARG}' not found in LIVE database" >&2; exit 1; }

echo "backup user_id=${BACKUP_UID} → live user_id=${LIVE_UID}"

EXPORT_SQL="${WORKDIR}/mfa-devices.sql"
{
  echo "BEGIN;"
  for T in \
    authentik_stages_authenticator_totp_totpdevice \
    authentik_stages_authenticator_webauthn_webauthndevice
  do
    EXISTS="$(kubectl -n "${NS}" exec "${POD}" -- \
      psql -U authentik -d authentik -Atc "SELECT to_regclass('public.${T}') IS NOT NULL;")"
    [[ "${EXISTS}" == "t" ]] || continue
    echo "DELETE FROM ${T} WHERE user_id=${LIVE_UID};"
    kubectl -n "${NS}" exec "${POD}" -- \
      psql -U authentik -d authentik -c \
      "\\copy (SELECT * FROM ${T} WHERE user_id=${BACKUP_UID}) TO STDOUT WITH (FORMAT csv, HEADER true)" \
      > "${WORKDIR}/${T}.csv" || true
    if [[ ! -s "${WORKDIR}/${T}.csv" ]] || [[ "$(wc -l < "${WORKDIR}/${T}.csv" | tr -d ' ')" -le 1 ]]; then
      echo "-- no rows in ${T}"
      continue
    fi
    python3 - "${WORKDIR}/${T}.csv" "${T}" "${LIVE_UID}" <<'PY'
import csv, sys
path, table, live_uid = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, newline="") as f:
    rows = list(csv.DictReader(f))
if not rows:
    sys.exit(0)
cols = list(rows[0].keys())
for r in rows:
    if "user_id" in r:
        r["user_id"] = live_uid
    vals = []
    for c in cols:
        v = r[c]
        if v is None or v == "":
            vals.append("NULL")
        else:
            vals.append("'" + str(v).replace("'", "''") + "'")
    print(f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(vals)});")
PY
  done
  echo "COMMIT;"
} > "${EXPORT_SQL}"

echo "Applying device rows to live DB (replace strategy)..."
psql -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}" -v ON_ERROR_STOP=1 -f "${EXPORT_SQL}"

kubectl -n "${NS}" delete pod "${POD}" --wait=true
POD=""
echo "OK: MFA devices for '${USER_ARG}' restored. Verify login with TOTP/Passkey."
