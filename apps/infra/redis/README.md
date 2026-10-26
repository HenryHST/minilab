# Valkey (shared)

Shared Valkey 9.1 (Redis protocol) for cluster apps (AOF on Longhorn). Primary consumer: **Paperless** (`redis://redis.redis.svc:6379/0`).

**Authentik** uses a dedicated StatefulSet in `apps/ops/authentik/redis.yaml`
(`authentik-redis.authentik.svc.cluster.local`) — do not point the IdP back at this Service.

### Redis → Valkey cutover

Valkey 9.1 cannot load Redis 8 AOF/RDB (**format v15** → CrashLoop). Wipe `/data` once while scaled to 0 (broker/cache only). Deployment uses **`Recreate`** so the RWO PVC is not dual-attached during upgrades.

BookStack: **Paperless** → Incident 2026-10-26 Redis→Valkey (Archify Architektur + Diagnose).

| Item | Value |
|------|--------|
| Namespace | `redis` |
| Replicas | 1 (Deployment) |
| Persistence | Longhorn PVC `redis-data` 2Gi RWO, AOF |
| Pin | `worker=true` |
| NetworkPolicy | allows `redis`, `paperless`, `authentik` (Authentik kept for rollback) |
| Image | `valkey/valkey:9.1.2-alpine` |
| Argo | ApplicationSet `infra` → app `redis`, sync wave `1` |

## Verify

```bash
kubectl -n redis get pods,pvc,svc
kubectl -n redis get deploy redis -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
# expect: valkey/valkey:9.1.2-alpine
kubectl -n redis exec deploy/redis -- valkey-cli ping
# After Argo sync: Paperless Ready (PAPERLESS_REDIS unchanged → redis.redis.svc)
```

ADR: Paperless [`docs/adr/0026-paperless-ngx.md`](../../docs/adr/0026-paperless-ngx.md).
