# CloudNativePG

PostgreSQL operator (CloudNativePG) in `cnpg-system`. The first `Cluster` is Termix (`apps/dev/termix/cnpg-cluster.yaml`, Service `termix-rw`). `n8n`, `paperless`, and Authentik are unchanged.

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

## Termix

Import and cutover: [ADR-0030](../../../docs/adr/0030-cloudnative-pg.md). Operator egress includes TCP 8000 so instance status checks succeed. Further imports: [CNPG database import](https://cloudnative-pg.io/docs/current/database_import).

ADR: [`docs/adr/0030-cloudnative-pg.md`](../../../docs/adr/0030-cloudnative-pg.md).
