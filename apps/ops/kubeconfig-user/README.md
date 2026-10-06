# kubeconfig-user

Ops app (sync wave **1**): ServiceAccount with **cluster-admin**, classic SA token Secret, and a PostSync Job that writes a downloadable kubeconfig into Secret `kubeconfig-user-kubeconfig` (key `config`).

Inspired by [colinjlacy/kubeconfig-creation-script](https://github.com/colinjlacy/kubeconfig-creation-script/blob/main/example.yaml).

## Flags

| Flag | Effect |
|------|--------|
| ApplicationSet list entry `kubeconfig-user` | App deployed / not deployed |
| `enabled` in `values.yaml` | Chart renders nothing when `false` (re-render manifest) |
| `kubeconfigJob.enabled` | Job + job RBAC on/off |

## Regenerate manifest

```bash
cd apps/ops/kubeconfig-user
helm template kubeconfig-user ./chart -f values.yaml --namespace kubeconfig-user > helm-manifest.yaml
```

Argo CD syncs this directory via ApplicationSet `ops` (`path: apps/ops/kubeconfig-user`). Commit `helm-manifest.yaml` after value changes.

## Extract kubeconfig (trusted host only)

Secret contains a **cluster-admin** token — do not publish. API server in the file: `https://192.168.0.40:6443` (LAN).

```bash
# require existing admin kubectl access to read the secret
kubectl -n kubeconfig-user get job,secret
kubectl -n kubeconfig-user get secret kubeconfig-user-kubeconfig \
  -o jsonpath='{.data.config}' | base64 -d > ~/.kube/nXk3-cluster-admin
chmod 600 ~/.kube/nXk3-cluster-admin

export KUBECONFIG=~/.kube/nXk3-cluster-admin
kubectl get nodes
kubectl auth can-i '*' '*' --all-namespaces

# or one-shot:
# kubectl --kubeconfig ~/.kube/nXk3-cluster-admin get pods -A
```

## Rotate token

```bash
kubectl -n kubeconfig-user delete secret cluster-admin-sa-token kubeconfig-user-kubeconfig
# Re-sync app (or delete Job so PostSync recreates) so the token Secret is recreated and the Job rewrites the kubeconfig.
```
