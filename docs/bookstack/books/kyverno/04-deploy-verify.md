---
title: Deploy & Verify
book_version: "1.0.0"
---

# Deploy & Verify

## Deploy

1. Merge in minilab `main` (App + ApplicationSet + AppProject Destination `kyverno`).
2. Argo ApplicationSet `infra` erzeugt Application `kyverno` (Wave 0).
3. Sync: Helm Chart + `policies/`.

```bash
kubectl -n argocd get application kyverno
kubectl -n kyverno get pods,deploy
kubectl get validatingwebhookconfiguration | grep kyverno
kubectl get clusterpolicy
```

## Audit-Demo (ohne Block)

```bash
kubectl create ns kyverno-audit-demo
kubectl -n kyverno-audit-demo apply -f - <<'YAML'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: bad-sc
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
  storageClassName: local-path
YAML
# Apply gelingt; Report kann fail zeigen:
kubectl get policyreport -n kyverno-audit-demo -o wide
kubectl delete ns kyverno-audit-demo
```

Ops-Kurzreferenz: [`apps/infra/kyverno/README.md`](../../../../apps/infra/kyverno/README.md).
