# plugin-barman-cloud

CNPG-I Barman Cloud plugin in `cnpg-system` (sidecar provides `barman-cloud-*` binaries for `standard-bookworm` images).

| | |
|--|--|
| Argo | ApplicationSet `infra`, sync wave `2`, namespace `cnpg-system` |
| Chart | `plugin-barman-cloud` 0.8.1 (app **v0.15.1**) from `https://cloudnative-pg.github.io/charts` |
| Depends on | `cloudnative-pg` operator ≥1.26, cert-manager |
| Consumers | `ObjectStore` + `Cluster.spec.plugins` (Authentik: `authentik-pg-wal` → RustFS) |

## Why

In-tree `spec.backup.barmanObjectStore` is deprecated and fails on `…-standard-bookworm` (no barman binaries) — Incident 2026-11-01. The plugin runs a sidecar instead of baking binaries into the Postgres image.

## Verify

```bash
kubectl -n argocd get application plugin-barman-cloud
kubectl -n cnpg-system rollout status deploy/plugin-barman-cloud
kubectl get crd objectstores.barmancloud.cnpg.io
kubectl -n authentik get objectstore.barmancloud.cnpg.io
```

Docs: [Installation](https://cloudnative-pg.io/plugin-barman-cloud/docs/installation/) · [Usage (RustFS example)](https://cloudnative-pg.io/plugin-barman-cloud/docs/usage/) · BookStack k3s → CNPG Day-2 Monitoring.
