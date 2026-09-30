# CloudNativePG

PostgreSQL operator (CloudNativePG). This app installs **only the operator** in `cnpg-system`. No `Cluster` CRs and no migration of existing Postgres (`n8n`, `paperless`, `termix`, Authentik).

| | |
|--|--|
| Argo | ApplicationSet `infra`, sync wave `1`, namespace `cnpg-system` |
| Chart | `cloudnative-pg` 0.27.0 (operator 1.28.0) from `https://cloudnative-pg.github.io/charts` |
| ServiceAccount | `postgres-cloud-sa` (ClusterRole/Binding from the chart) |
| Metrics | PodMonitor port `metrics` (8080), label `release: kube-prometheus-stack` |
| Webhook | Chart-managed certs on `cnpg-webhook-service:443` → pod `:9443` |

## Verify

```bash
kubectl -n argocd get application cloudnative-pg
kubectl -n cnpg-system get pods,sa,networkpolicy,podmonitor
kubectl get crd clusters.postgresql.cnpg.io
```

Expect the operator pod Ready and ServiceAccount `postgres-cloud-sa`.

## Later

Database import (not this change): [CNPG database import](https://cloudnative-pg.io/docs/current/database_import). Instance TLS via cert-manager belongs on the first `Cluster`, not on the operator webhook.

ADR: [`docs/adr/0030-cloudnative-pg.md`](../../../docs/adr/0030-cloudnative-pg.md).
