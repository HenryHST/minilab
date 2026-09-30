---
title: Deploy und Verify
book_version: "1.3.0"
---

# Deploy und Verify

## Voraussetzungen

1. ApplicationSet `infra` enthält `cloudnative-pg` (Wave 1, `extras: true`, Chart `0.27.0`).
2. AppProject `infra` erlaubt Destination `cnpg-system`.
3. Prometheus wählt PodMonitore mit `release: kube-prometheus-stack`.

## Sync

```bash
kubectl -n argocd get application cloudnative-pg
kubectl -n cnpg-system get pods,sa,networkpolicy,podmonitor
kubectl get crd clusters.postgresql.cnpg.io
```

## Checks

1. Pod des Operators ist Ready, ServiceAccount heißt `postgres-cloud-sa`.
2. CRD `clusters.postgresql.cnpg.io` existiert.
3. PodMonitor `cloudnative-pg` trägt `release: kube-prometheus-stack`.
4. Prometheus-Target für `cnpg-system/cloudnative-pg` ist `up` auf Port 8080.
5. NetworkPolicies `cloudnative-pg` und `cloudnative-pg-instance-status` sind vorhanden.

Upstream-E2E läuft im Homelab nicht.
