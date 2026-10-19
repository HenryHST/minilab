# Authentik (nXk3 IdP)

GitOps install for `idp.stadthagen.dev`. Day-0 blueprints: [BLUEPRINTS.md](BLUEPRINTS.md).

## Scheduling / HA

- **No** hard `nodeSelector: worker=true` and **no** hostname pin (`nodeName` / required affinity).
- Soft `nodeAffinity` prefers Proxmox (`worker=true`); Pi agents are a valid fallback (multi-arch images).
- Do **not** label Pis with `worker=true` (Traefik / Longhorn-disk stay Proxmox-only).
- server/worker **replicas: 2**, `RollingUpdate`, PDB `minAvailable: 1` (`pdb.yaml`). Media PVC is **RWX**.
- Runtime/HA narrative: Infra_LAB BookStack **Authentik Runtime** + `docs/diagrams/authentik/authentik-{scheduling,fail-domains,failover}.html`.

```bash
kubectl -n authentik get deploy,pods,pdb -o wide
kubectl -n authentik get deploy authentik-server -o yaml | grep -A25 affinity
```

## Database (CloudNativePG)

Postgres is Cluster `authentik-pg` (Service `authentik-pg-rw`, PG17, Longhorn 8Gi). Helm subchart is off (`postgresql.enabled: false`). Cutover notes: [09-cnpg-migration](../../docs/bookstack/books/authentik/09-cnpg-migration.md), [ADR-0033](../../docs/adr/0033-authentik-cnpg.md).

### TLS (Hybrid)

Server CA/TLS comes from cert-manager (`cnpg-certificates.yaml` → Secret `authentik-pg-server-tls`). Client/replication stay operator-managed (`authentik-pg-ca`, `authentik-pg-replication`). App uses `AUTHENTIK_POSTGRESQL__SSLMODE=require` (no CA mount yet).

```bash
kubectl -n authentik get certificate authentik-pg-server
kubectl -n authentik get cluster authentik-pg -o jsonpath='{.status.certificates}' | jq .
```

**Follow-up (not in pilot):** (1) mount CA + `verify-full` / `SSLROOTCERT=file:///certs/ca.crt` and update Infra_LAB SecretSpec; (2) same hybrid pattern for Termix (`apps/dev/termix/`).

## Redis (Performance)

Authentik **requires** Redis for cache, sessions, and the task broker. Without it, gunicorn saturates CPU and the login flow (`/if/flow/default-authentication-flow/`) shows multi-second tails (measured ~p90 2–4 s → ~130 ms after wiring).

| Piece | Value |
|-------|--------|
| Shared instance | `apps/infra/redis` → Service `redis.redis.svc.cluster.local:6379` |
| Config | `values.yaml` → `authentik.redis.host` → Secret key `AUTHENTIK_REDIS__HOST` |
| NetworkPolicy | `redis/redis-ingress` allows namespaces `redis`, `paperless`, **`authentik`** |
| Server resources | requests `250m` / `1Gi`, limit `3Gi` (worker limit `1Gi`) |

Verify:

```bash
kubectl -n authentik get secret authentik -o jsonpath='{.data.AUTHENTIK_REDIS__HOST}' | base64 -d; echo
kubectl -n authentik run redis-probe --rm -i --restart=Never --image=busybox:1.36 \
  --command -- nc -zvw3 redis.redis.svc.cluster.local 6379
# Login flow should stay under ~300 ms p90 externally:
# curl -sk -o /dev/null -w '%{time_total}\n' https://idp.stadthagen.dev/if/flow/default-authentication-flow/
```

After changing `values.yaml`, re-render `helm-manifest.yaml` (see Helm below) and sync Application `authentik` **and** `redis` (NetworkPolicy).

## Brand media (logos / background)

NFS source: `192.168.0.25:/var/nfs/shared/infra01/media/public/branding/` → PVC `authentik-media` at `/media/public/branding/`.

- **PostSync Job** `authentik-media-sync-bootstrap` — runs once after each successful Argo sync (so Day-0 is not empty until the CronJob fires).
- **CronJob** `authentik-media-sync` — every 6h thereafter.

Manual: `kubectl -n authentik create job --from=cronjob/authentik-media-sync media-sync-manual`

Brand paths in Infra_LAB Terraform: `branding/{favicon,key_transparent,website-work}.*` (served as `/files/media/public/branding/...?token=`).

**Note:** Branding sync ≠ full backup. Daily NFS backup (below) also covers uploads/icons on the media PVC; secrets stay in SecretSpec only.

## Backup / Restore

Upstream: [Backup and restore](https://docs.goauthentik.io/sys-mgmt/ops/backup-restore/) · HPA: [Autoscaling](https://docs.goauthentik.io/sys-mgmt/ops/autoscaling/hpa/).

| Upstream | Lab | In archive? |
|----------|-----|-------------|
| PostgreSQL (users, flows, **TOTP/WebAuthn**) | CNPG `authentik-pg` / `pg_dump` | Yes — `db.sql.gz` |
| `/data` (icons, uploads) | PVC `authentik-media` → `/media` | Yes — `media.tar.gz` |
| `/certs`, `/custom-templates`, `/blueprints` | N/A or GitOps ConfigMap | No |

### Schedule (Europe/Berlin, maintenance / scale-to-0)

| CronJob | Schedule | Downtime |
|---------|----------|----------|
| `authentik-backup-0230` | `30 2 * * *` | ~15–25 min (Traefik app-down) |
| `authentik-backup-1150` | `50 11 * * *` | same |

Each run: HPA pause if present (`minReplicas`/`maxReplicas` → 0) → scale server+worker to 0 → `pg_dump` + media PVC mount → combined `authentik-YYYYMMDD-HHMMSS.tar.gz` written **in parallel** to:

| Target | Details |
|--------|---------|
| **NFS** | PVC `authentik-backups` → `192.168.0.25:…/authentik-backups` |
| **S3** | RustFS pi7cl `http://192.168.0.107:9000`, bucket `authentik-backups`, Secret `authentik-backup-s3` |

Retention **30 days** per target. Job fails if either upload fails. Chart HPA is typically off today (`server/worker.autoscaling.enabled: false`); backup logic is HPA-aware for when it is enabled later (optional follow-up: min 2 / max 5 per [upstream HPA](https://docs.goauthentik.io/sys-mgmt/ops/autoscaling/hpa/)).

```bash
# NAS once
mkdir -p /var/nfs/shared/infra01/authentik-backups

# Manual backup (either slot)
kubectl -n authentik create job --from=cronjob/authentik-backup-0230 authentik-backup-manual
kubectl -n authentik logs -f job/authentik-backup-manual -c backup
```

### Full restore (bootstrap)

ConfigMap `authentik-restore`:

| Key | Values |
|-----|--------|
| `enabled` | `true` to run PostSync Job |
| `archive` | `latest` or filename |
| `source` | `auto` (default; prefer NFS) \| `nfs` \| `s3` |
| `force` | `true` if DB/media already populated |
| `serverReplicas` / `workerReplicas` | default `2` |

Order: scale 0 → Postgres import → `/media` → scale up. **MFA guarantee:** TOTP/Passkeys return only if `AUTHENTIK_SECRET_KEY` is unchanged since the backup (SecretSpec / `authentik-credentials` / secret `authentik`). After success, set `enabled=false` immediately.

### Selective MFA restore

```bash
apps/ops/authentik/scripts/restore-user-mfa.sh latest <username|email> auto --i-know-secret-key-matches
```

Replaces that user’s TOTP + WebAuthn rows from the archive into the live DB (same SECRET_KEY guard).

Siehe [ADR-0015](../../docs/adr/0015-backup-restore-cronjobs.md).

**Rollback-Hinweis:** PVC `data-authentik-postgresql-0` (Bitnami) bleibt Bound, bis bewusst gelöscht. Nach Haltbarkeit entsorgen.

## Helm (vendored + rendered)

Avoids Argo CD `kustomize --enable-helm` / `helm pull` races (`charts/... already exists`).

```bash
# bump chart version, then:
helm pull authentik --repo https://charts.goauthentik.io --version 2026.8.4 --untar --untardir charts
helm dependency update charts/authentik
helm template authentik ./charts/authentik \
  -f values.yaml --namespace authentik --include-crds \
  > helm-manifest.yaml
```

IdP config (OAuth/LDAP/Brand) stays in Infra_LAB OpenTofu / `--tags authentik-bootstrap`.

### RBAC / Trivy (managed outposts)

Role `authentik` comes from the `authentik-remote-cluster` subchart (`serviceAccount.create: true`, needed for managed outposts). Outposts (`app.kubernetes.io/managed-by: goauthentik.io`) create Deployments, Services, Secrets, Ingresses, Middlewares, and ServiceMonitors — those write verbs stay.

Stripped locally (unused here): `configmaps`, `httproutes` (Gateway API). After chart bumps, re-apply the patch in `charts/authentik/charts/authentik-remote-cluster/templates/role.yaml` and re-render.

| Trivy check | Severity | Status |
|-------------|----------|--------|
| AVD-KSV-0049 (configmaps) | MEDIUM | Cleared by patch |
| AVD-KSV-0113 (secrets) | MEDIUM | Accepted — outpost secrets |
| AVD-KSV-0056 (services/ingresses) | HIGH | Accepted — outpost networking |
| AVD-KSV-0048 (deployments) | MEDIUM | Accepted — outpost workloads |

Other Roles in the namespace (`authentik-pg`, `authentik-restore`, `backup-runner-role`) are unrelated and left unchanged.

## Bootstrap-Admin (Anmelde-Passwort)

```bash
cd ansible/playbooks/k3s_cluster/secrets   # Infra_LAB
secretspec get AUTHENTIK_BOOTSTRAP_PASSWORD --profile cluster
secretspec get AUTHENTIK_BOOTSTRAP_EMAIL --profile cluster

kubectl -n authentik get secret authentik-credentials \
  -o jsonpath='{.data.AUTHENTIK_BOOTSTRAP_PASSWORD}' | base64 -d; echo
kubectl -n authentik get secret authentik-credentials \
  -o jsonpath='{.data.AUTHENTIK_BOOTSTRAP_EMAIL}' | base64 -d; echo
```
