# argocd-image-updater

[Argo CD Image Updater](https://argocd-image-updater.readthedocs.io/) watches the Lab Registry and commits image bumps back to **minilab** (Git write-back).

| | |
|---|---|
| Namespace | `argocd` |
| Chart | [argo-helm/argocd-image-updater](https://github.com/argoproj/argo-helm/tree/main/charts/argocd-image-updater) **1.3.1** (app **v1.3.0**) |
| Sync wave | `1` (ApplicationSet `ops`) |
| Registry | `registry.stadthagen.dev` (minilab `apps/ops/registry`) |
| Write-back | Git → `HenryHST/minilab` via Secret `argocd-image-updater-git` |
| Pilot | Application `registry-demo` + CR `lab-registry-pilot` |

## Prerequisites (Infra_LAB)

1. Fine-grained GitHub PAT with **Contents: Write** on `HenryHST/minilab`
2. `secretspec set ARGOCD_IMAGE_UPDATER_GIT_TOKEN --profile cluster --provider cluster_age`
3. `ansible-playbook site.yaml --tags secrets --limit nxk3-cp01`
4. Confirm: `kubectl -n argocd get secret argocd-image-updater-git`

Without the secret, the controller starts but Git write-back fails (expected).

## Files

| Path | Role |
|------|------|
| `values.yaml` | Helm values (registries, git author, resources) |
| `manifests/imageupdater-lab-pilot.yaml` | `ImageUpdater` CR (allowlist: `registry-demo` only) |

## Verify

```bash
kubectl -n argocd get deploy,pods -l app.kubernetes.io/name=argocd-image-updater
kubectl -n argocd get imageupdater
kubectl -n argocd logs deploy/argocd-image-updater-controller --tail=100
```

See Infra_LAB [docs/argocd-image-updater.md](https://github.com/HenryHST/Infra_LAB/blob/main/docs/argocd-image-updater.md) and [ADR-0025](https://github.com/HenryHST/Infra_LAB/blob/main/docs/adr/0025-argocd-image-updater-git-writeback.md).
