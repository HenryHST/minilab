# Noto fonts (OFL) for BookStack dompdf PDF exports

Source: [googlefonts/noto-fonts](https://github.com/googlefonts/noto-fonts)

Synced to the pod under `/app/www/storage/fonts/dompdf/` and `/config/www/fonts/dompdf/` by the Argo PostSync Job [`theme-modules-sync.yaml`](../theme-modules-sync.yaml). Delivery is via one ConfigMap per TTF (`font-cm-*.yaml`, Kubernetes ≤1 MiB limit).

## GitOps (ConfigMap → Pod)

| Repo file (`fonts/dompdf/`) | ConfigMap | Notes |
|-----------------------------|-----------|--------|
| `NotoSans.ttf` | `bookstack-font-notosans` | Hinted Regular — PDF body |
| `NotoSans-Bold.ttf` | `bookstack-font-notosans-bold` | Hinted Bold — PDF body |
| `NotoSansMono-*.ttf` (8 weights) | `bookstack-font-notosansmono-*` | Code/monospace in PDF |
| `NotoSerif-{Regular,Bold,Italic,Light,Medium}.ttf` | `bookstack-font-notoserif-*` | Serif family for PDF |

Upstream paths (examples):

- Hinted Sans: `hinted/ttf/NotoSans/NotoSans-Regular.ttf` → committed as `NotoSans.ttf`
- Hinted Sans Bold: `hinted/ttf/NotoSans/NotoSans-Bold.ttf`
- Mono / Serif: `hinted/ttf/NotoSansMono/…`, `hinted/ttf/NotoSerif/…`

## In repo only (not ConfigMap — exceed 1 MiB binaryData)

These TTFs stay in Git as source inventory; they are **not** applied to the cluster (base64 ConfigMap would exceed the 1 MiB etcd limit):

- `NotoSans-Light.ttf`, `NotoSans-Medium.ttf`, `NotoSans-Regular.ttf`, `NotoSans-SemiBold.ttf`
- `NotoSerif-Thin.ttf`

PDF body uses the smaller hinted `NotoSans.ttf` / `NotoSans-Bold.ttf` instead of the full Regular/SemiBold set.

## Regenerate a ConfigMap

```bash
cd apps/dev/bookstack
kubectl create configmap bookstack-font-notosansmono-regular \
  --from-file=NotoSansMono-Regular.ttf=fonts/dompdf/NotoSansMono-Regular.ttf \
  --namespace=bookstack --dry-run=client -o yaml > font-cm-notosansmono-regular.yaml
# Apply (server-side — avoids last-applied-configuration >256 KiB):
kubectl apply --server-side --force-conflicts -f font-cm-notosansmono-regular.yaml
```
