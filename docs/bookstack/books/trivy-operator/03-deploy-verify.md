---
title: Deploy und Verify
book_version: "1.0.0"
---

# Deploy und Verify

## Deploy

1. AppProject `ops` enthält Destination `trivy-system`.
2. ApplicationSet-Eintrag `trivy-operator` (Wave 1) + `values.yaml`.
3. Merge nach `main` → Argo sync (automated).

## Verify

```bash
kubectl -n argocd get application trivy-operator
kubectl -n trivy-system get deploy,pods,servicemonitor
kubectl -n trivy-system logs deploy/trivy-operator --tail=50
kubectl get vulnerabilityreports -A | head
kubectl get configauditreports -A | head
```

Erwartung: Deployment Ready, ServiceMonitor vorhanden, erste Reports nach kurzer Zeit.
