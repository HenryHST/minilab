# Deploy & Verify

## Deploy

Values: `apps/infra/k8tz/values.yaml`. ApplicationSet-Eintrag in `apps/argocd-apps/raw/applicationset-infra.yaml`.

```bash
kubectl -n argocd get application k8tz
kubectl -n k8tz get pods
kubectl get mutatingwebhookconfiguration | grep k8tz
```

## Injection test

```bash
kubectl run k8tz-test --image=busybox:1.36 --restart=Never --command -- sleep 60
kubectl get pod k8tz-test -o jsonpath='{.spec.initContainers[*].name}{"\n"}'
kubectl exec k8tz-test -- date
kubectl delete pod k8tz-test --wait=false
```

Opt-out:

```bash
kubectl annotate pod k8tz-test k8tz.io/inject=false --overwrite   # vor Create setzen
```
