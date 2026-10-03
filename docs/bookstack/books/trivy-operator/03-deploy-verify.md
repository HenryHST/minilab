---
title: Deploy und Verify
book_version: "1.1.0"
---

# Deploy und Verify

## Deploy

1. AppProject `ops` enthält Destination `trivy-system`.
2. ApplicationSet-Eintrag `trivy-operator` (Wave 1) + `values.yaml`.
3. Merge nach `main` → Argo sync (automated).

## Verify

```bash
kubectl -n argocd get application trivy-operator
kubectl -n trivy-system get deploy,sts,svc,servicemonitor,pods
kubectl -n trivy-system logs deploy/trivy-operator --tail=50
kubectl get vulnerabilityreports -A | head
kubectl get configauditreports -A | head
```

Erwartung: Operator Deployment Ready, Trivy-Server StatefulSet Ready, Service ClusterIP (nicht headless), ServiceMonitor vorhanden, erste Reports nach kurzer Zeit. In Grafana: Folder Trivy → Trivy Operator Dashboard.
