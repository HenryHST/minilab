# Redis

Shared Redis for cluster apps (AOF on Longhorn). First consumer: Paperless (`redis://redis.redis.svc:6379/0`).

- Image: `redis:7-alpine`
- Argo: ApplicationSet `infra` → app `redis`, sync wave `1`, namespace `redis`

## Verify

```bash
kubectl -n redis get pods,pvc,svc
kubectl -n redis exec deploy/redis -- redis-cli ping
```

ADR: Paperless [`docs/adr/0026-paperless-ngx.md`](../../docs/adr/0026-paperless-ngx.md).
