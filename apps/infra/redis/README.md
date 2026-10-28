# Valkey (shared)

Shared Valkey 9.1 (Redis protocol) for cluster apps. Primary consumer: **Paperless** (`redis://redis.redis.svc:6379/0`).

**Authentik** uses a dedicated StatefulSet in `apps/ops/authentik/redis.yaml`
(`authentik-redis.authentik.svc.cluster.local`) — do not point the IdP back at this Service.

### Persistence

**Ephemeral `emptyDir`** (no Longhorn PVC). Broker/cache only — pod restart loses AOF/RDB (accepted). Removes RWO FailedAttach and Terminating-PVC / `PodUsingPVC` failure modes (incident 2026-10-28).

Historical: Redis→Valkey cutover 2026-10-26 used a Longhorn RWO PVC + `Recreate` + one-time AOF wipe — see BookStack Paperless incident chapter. PVC removed 2026-10-28.

| Item | Value |
|------|--------|
| Namespace | `redis` |
| Replicas | 1 (Deployment) |
| Persistence | `emptyDir` at `/data` (AOF in-pod only) |
| Pin | `worker=true` |
| NetworkPolicy | allows `redis`, `paperless`, `authentik` (Authentik kept for rollback) |
| Image | `valkey/valkey:9.1.2-alpine` |
| Argo | ApplicationSet `infra` → app `redis`, sync wave `1` |
| Alert | `NXk3SharedRedisDown` (kube-prometheus-stack) |

## Verify

```bash
kubectl -n redis get pods,pvc,svc
# expect: no redis-data PVC
kubectl -n redis get deploy redis -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
# expect: valkey/valkey:9.1.2-alpine
kubectl -n redis exec deploy/redis -- valkey-cli ping
# After Argo sync: Paperless Ready (PAPERLESS_REDIS unchanged → redis.redis.svc)
```

ADR: Paperless [`docs/adr/0026-paperless-ngx.md`](../../docs/adr/0026-paperless-ngx.md).
BookStack: **Paperless** → Incident Redis→Valkey + Appendix 2026-10-28.
