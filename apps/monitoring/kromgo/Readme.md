# Kromgo

Prometheus metric badges on `https://kromgo.stadthagen.dev` (Argo app `kromgo`, sync wave 3).

## Deploy

- Image pin: `ghcr.io/home-operations/kromgo:0.16.1`
- ConfigMap `kromgo-config` → `/config/config.yaml`
- Env `KROMGO_PROMETHEUS_URL` → `kube-prometheus-stack-prometheus.monitoring.svc:9090`
- `nodeSelector: worker=true` (Proxmox only — Pis cannot sustain Prometheus; empty Endpoints → badge “query error”)
- TLS: cert-manager → Secret `kromgo-tls`
- DNS: Hetzner A `kromgo` → Traefik LB `192.168.0.215` (LAN; not pangolin-publish)

## NetworkPolicy

- App NS: ingress Traefik; egress monitoring:9090 + kube-system DNS
- Prometheus (`apps/monitoring/kube-prometheus-stack/manifests/networkpolicy.yaml`): allow ingress from NS `kromgo` on :9090

## Badges

| id | Meaning |
|----|---------|
| `cluster_cpu` / `cluster_memory` / `pod_count` | Cluster utilisation |
| `nodes_ready` / `nodes_notready` | kube-state Ready conditions (Phase 4) |
| `disk_pressure` / `memory_pressure` | Node pressure counts |
| `root_free_min` | Min root filesystem free % (alert threshold 20 %) |
| `longhorn_ready` | Longhorn Ready count on Proxmox disk nodes only (`worker=true`) |
| `cilium_unavailable` | Cilium DaemonSet unavailable pods (`kube-system/cilium`) |
| `pi1cl_ready` / `pi2cl_ready` / `pi4cl_ready` / `pi7cl_ready` | Per-Pi kube Ready (1=Ready / 0=Down) |

Embedded on Gatus anonymous overview (`https://status.stadthagen.dev/uebersicht` → sections **nXk3 cluster** + **nXk3 pis**). Kromgo is LAN-only (ADR-0019). Pis are not Gatus HTTP/ICMP endpoints (ADR-0034).

## Verify

```bash
kubectl -n kromgo get pods,ingressroute,certificate
dig +short A kromgo.stadthagen.dev
curl -kI https://kromgo.stadthagen.dev/
curl -kI https://kromgo.stadthagen.dev/badges/cluster_cpu
curl -kI https://kromgo.stadthagen.dev/badges/nodes_ready
curl -kI https://kromgo.stadthagen.dev/badges/disk_pressure
curl -kI https://kromgo.stadthagen.dev/badges/longhorn_ready
curl -kI https://kromgo.stadthagen.dev/badges/cilium_unavailable
curl -kI https://kromgo.stadthagen.dev/badges/pi1cl_ready
curl -kI https://kromgo.stadthagen.dev/badges/pi7cl_ready
```

After ConfigMap changes: `kubectl -n kromgo rollout restart deploy/kromgo` (subPath mount).

ADR: [`docs/adr/0019-kromgo.md`](../../docs/adr/0019-kromgo.md). Upstream: [home-operations/kromgo](https://github.com/home-operations/kromgo).
