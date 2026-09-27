# k8tz

Mutating admission webhook that injects timezone (`Europe/Berlin`) into Pods via bootstrap `initContainer`.

- Chart: [k8tz 0.20.0](https://github.com/k8tz/k8tz) (`https://k8tz.github.io/k8tz/`)
- Argo: ApplicationSet `infra` → app `k8tz`, sync wave `1`, namespace `k8tz`
- Opt-out: annotation `k8tz.io/inject: "false"` on Pod or Namespace
- Override TZ: `k8tz.io/timezone: Africa/Cairo`

## Verify

```bash
kubectl -n k8tz get pods,mutatingwebhookconfiguration
kubectl run k8tz-test --image=busybox:1.36 --restart=Never --command -- sleep 60
kubectl get pod k8tz-test -o yaml | grep -A5 -E 'initContainers:|k8tz.io'
kubectl delete pod k8tz-test --wait=false
```

ADR: [`docs/adr/0020-k8tz.md`](../../docs/adr/0020-k8tz.md).
