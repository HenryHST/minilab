# Kyverno

Admission controller with **Audit-only** ClusterPolicies for nXk3 (storage, placement, privileged, resources, image registries).

| | |
|--|--|
| Argo App | `kyverno` (ApplicationSet `infra`, Wave **0**) |
| Namespace | `kyverno` |
| Chart | `kyverno` **3.9.1** (app ~v1.19.1) from `https://kyverno.github.io/kyverno/` |
| Policies | `apps/infra/kyverno/policies/*.yaml` |
| failureAction | `Audit` (PolicyReports; no deny on apply) |
| Opt-out | Namespace or object label `policy.stadthagen.dev/exempt: "true"` |

ADR: [`docs/adr/0032-kyverno-admission-audit.md`](../../../docs/adr/0032-kyverno-admission-audit.md). BookStack: `docs/bookstack/books/kyverno/`.

## Verify

```bash
kubectl -n argocd get application kyverno
kubectl -n kyverno get pods,deploy
kubectl get validatingwebhookconfiguration | grep kyverno
kubectl get clusterpolicy
kubectl get policyreport -A | head
```

Sample Audit (apply succeeds; report may show fail):

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
kubectl get policyreport -n kyverno-audit-demo
kubectl delete ns kyverno-audit-demo
```

## Exclude namespaces (policies)

`kube-system`, `kyverno`, `argocd`, `longhorn-system`, `traefik`, `cnpg-system`, `certmanager`, `node-feature-discovery`, `k8tz`, `trivy-system`.
