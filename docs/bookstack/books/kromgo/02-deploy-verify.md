# Deploy & Verify

## Sync

Argo Application `kromgo` (path `apps/monitoring/kromgo`, automated, `CreateNamespace=true`).

Prometheus NetPol muss Ingress aus NS `kromgo` auf :9090 erlauben (`apps/monitoring/kube-prometheus-stack/manifests/networkpolicy.yaml`).

## DNS

Hetzner Console Zone `stadthagen.dev`: A-Record `kromgo` → `192.168.0.215` (nicht pangolin-publish).

## Checks

```bash
kubectl -n kromgo get pods,certificate,ingressroute
dig +short A kromgo.stadthagen.dev   # → 192.168.0.215
curl -kI https://kromgo.stadthagen.dev/
curl -kI https://kromgo.stadthagen.dev/badges/cluster_cpu
```

Homepage (Monitoring): Eintrag Kromgo.
