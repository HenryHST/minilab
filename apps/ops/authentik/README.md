# Authentik (nXk3 IdP)

GitOps install for `idp.stadthagen.dev`. Day-0 blueprints: [BLUEPRINTS.md](BLUEPRINTS.md).

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

- NAS: `mkdir -p /var/nfs/shared/infra01/authentik-backups`
- CronJob `authentik-backup-cron` (05:00 UTC): `pg_dump` gegen `authentik-pg-rw` (DB/User `authentik`, `PGSSLMODE=require`) + tar `/media` → combined `authentik-*.tar.gz` (Retention 7)
- Manuell: `kubectl -n authentik create job --from=cronjob/authentik-backup-cron authentik-backup-manual`
- Bootstrap-Restore: ConfigMap `authentik-restore` → `enabled=true` (bei vorhandener DB/Media zusätzlich `force=true`), Argo Sync (skaliert server+worker auf 0, stellt DB + Media wieder her); danach sofort `enabled=false` committen

Siehe [ADR-0015](../../docs/adr/0015-backup-restore-cronjobs.md).

**Rollback-Hinweis:** PVC `data-authentik-postgresql-0` (Bitnami) bleibt Bound, bis bewusst gelöscht. Nach Haltbarkeit entsorgen.

## Helm (vendored + rendered)

Avoids Argo CD `kustomize --enable-helm` / `helm pull` races (`charts/... already exists`).

```bash
# bump chart version, then:
helm pull authentik --repo https://charts.goauthentik.io --version 2026.8.3 --untar --untardir charts
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
