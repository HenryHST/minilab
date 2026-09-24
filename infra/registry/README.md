# registry (kube-registry)

In-cluster [Distribution](https://github.com/distribution/distribution) registry (`registry:3`) under GitOps.

| | |
|---|---|
| Namespace | `kube-system` |
| Service | `kube-registry.kube-system.svc:5000` (ClusterIP) |
| API host | `registry.stadthagen.dev` (Traefik TLS) |
| UI | [`infra/registry-ui`](../registry-ui/) → `registry-ui.stadthagen.dev` |
| Storage | PVC `kube-registry` 2Gi `longhorn-loki-local` (1 replica) RWO |
| GC | CronJob `kube-registry-gc` — Sundays 04:00 UTC |
| Sync wave | `0` (ApplicationSet `infra`) |

## Behaviour

- Filesystem storage + in-memory blobdescriptor cache; `delete` enabled (UI tag delete works).
- **UI delete ≠ GC** — deleted tags leave blobs until `registry garbage-collect -m` runs.
- GC flips the Deployment read-only (`REGISTRY_STORAGE_MAINTENANCE`), runs GC in-pod, then restores writes via EXIT trap.
- Strategy `Recreate` (RWO PVC). No kustomization.yaml (plain directory; avoids Argo CMP `:8081`).

## Migration (first sync)

If an out-of-band `kube-registry` Deployment/DaemonSet already exists:

1. Note existing PVC / data path.
2. Scale down or delete the external workload **before** Argo syncs this Deployment (same label `app: kube-registry`).
3. If data lives on another PVC, either rename/adopt it as `kube-registry` or restore into the new claim.
4. Point image refs / node configs at `registry.stadthagen.dev` or `kube-registry.kube-system.svc.cluster.local:5000` (LoadBalancer IP is removed).

## DNS

Create Hetzner/external A/AAAA for `registry.stadthagen.dev` → Traefik (same pattern as other `*.stadthagen.dev` hosts). Not published via Pangolin.

## Files

| File | Role |
|------|------|
| `deployment.yaml` | `registry:3` (digest-pinned) |
| `service.yaml` | ClusterIP :5000 |
| `pvc.yaml` | 50Gi Longhorn |
| `config.yml` / `configmap.yaml` | Distribution config (keep in sync) |
| `gc-cronjob.yaml` | CronJob + SA/RBAC |
| `gc-scripts-configmap.yaml` / `scripts/` | GC script (keep in sync) |
| `certificate.yaml` / `ingressroute.yaml` | TLS API host |
| `networkpolicy.yaml` | Ingress allow in-cluster + Traefik |
