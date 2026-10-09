# registry-demo

Pilot for **Argo CD Image Updater** + Lab Registry (`registry.stadthagen.dev`).

| | |
|---|---|
| Namespace | `registry-demo` |
| Source | Local Helm chart (this directory) |
| Sync wave | `3` (ApplicationSet `dev`) |
| Image | `registry.stadthagen.dev/dev/registry-demo:<tag>` |
| ImageUpdater | `lab-registry-pilot` in `apps/ops/argocd-image-updater` |

No Ingress — ClusterIP only. Purpose is to prove Git write-back updates `values.yaml`.

## Mirror (required before first healthy sync)

```bash
crane copy docker.io/library/nginx:1.27.1 \
  registry.stadthagen.dev/dev/registry-demo:1.27.1

# Optional newer patch for a write-back smoke test:
crane copy docker.io/library/nginx:1.27.4 \
  registry.stadthagen.dev/dev/registry-demo:1.27.4
```

Then wait for Image Updater (or restart the controller) and confirm a commit on `apps/dev/registry-demo/values.yaml`.

## ADR

minilab [ADR-0036](../../docs/adr/0036-argocd-image-updater.md) · Infra_LAB [ADR-0025](https://github.com/HenryHST/Infra_LAB/blob/main/docs/adr/0025-argocd-image-updater-git-writeback.md)
