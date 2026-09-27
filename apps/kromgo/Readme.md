# Kromgo

Prometheus metric badges on `https://kromgo.stadthagen.dev` (Argo app `kromgo`, sync wave 3).

## Deploy

- Image pin: `ghcr.io/home-operations/kromgo:0.16.1`
- ConfigMap `kromgo-config` → `/config/config.yaml`
- Env `KROMGO_PROMETHEUS_URL` → `kube-prometheus-stack-prometheus.monitoring.svc:9090`
- TLS: cert-manager → Secret `kromgo-tls`
- DNS: Hetzner A `kromgo` → Traefik LB `192.168.0.215` (LAN; not pangolin-publish)

## NetworkPolicy

- App NS: ingress Traefik; egress monitoring:9090 + kube-system DNS
- Prometheus (`infra/kube-prometheus-stack/manifests/networkpolicy.yaml`): allow ingress from NS `kromgo` on :9090

## Verify

```bash
kubectl -n kromgo get pods,ingressroute,certificate
dig +short A kromgo.stadthagen.dev
curl -kI https://kromgo.stadthagen.dev/
curl -kI https://kromgo.stadthagen.dev/badges/cluster_cpu
```

ADR: [`docs/adr/0019-kromgo.md`](../../docs/adr/0019-kromgo.md). Upstream: [home-operations/kromgo](https://github.com/home-operations/kromgo).
