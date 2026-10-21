# Redis (shared)

Shared Redis for cluster apps (AOF on Longhorn). Primary consumer: **Paperless** (`redis://redis.redis.svc:6379/0`).

**Authentik** uses a dedicated StatefulSet in `apps/ops/authentik/redis.yaml`
(`authentik-redis.authentik.svc.cluster.local`) — do not point the IdP back at this Service.

| Item | Value |
|------|--------|
| Namespace | `redis` |
| Replicas | 1 (Deployment) |
| Persistence | Longhorn PVC `redis-data` 2Gi RWO, AOF |
| Pin | `worker=true` |
| NetworkPolicy | allows `redis`, `paperless`, `authentik` (Authentik kept for rollback) |
| Image | `redis:8-alpine3.23` |
| Argo | ApplicationSet `infra` → app `redis`, sync wave `1` |

## Verify

```bash
kubectl -n redis get pods,pvc,svc
kubectl -n redis exec deploy/redis -- redis-cli ping
```

ADR: Paperless [`docs/adr/0026-paperless-ngx.md`](../../docs/adr/0026-paperless-ngx.md).
