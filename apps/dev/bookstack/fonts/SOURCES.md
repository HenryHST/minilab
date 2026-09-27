# Noto fonts (OFL) for BookStack dompdf PDF exports

Source: [googlefonts/noto-fonts](https://github.com/googlefonts/noto-fonts)

## GitOps delivery (ArgoCD path)

ArgoCD rejects the Application when **combined YAML in `apps/dev/bookstack/` exceeds ~10 MiB** (`exceeded max combined manifest file size` / `max combined manifest file size`). Each TTF-as-ConfigMap is ~0.75–1 MiB after base64, so only the two hinted body fonts are ConfigMaps:

| Repo file | ConfigMap | Role |
|-----------|-----------|------|
| `fonts/dompdf/NotoSans.ttf` | `bookstack-font-notosans` | PDF body (hinted Regular) |
| `fonts/dompdf/NotoSans-Bold.ttf` | `bookstack-font-notosans-bold` | PDF body (hinted Bold) |

PostSync Job [`theme-modules-sync.yaml`](../theme-modules-sync.yaml) copies them to `/app/www/storage/fonts/dompdf/` and `/config/www/fonts/dompdf/`.

Apply (server-side — avoids `last-applied-configuration` >256 KiB):

```bash
kubectl apply --server-side --force-conflicts \
  -f font-cm-notosans.yaml -f font-cm-notosans-bold.yaml
```

## Source inventory only (not ConfigMaps)

Additional TTFs under `fonts/dompdf/` (Mono, Serif, extra Sans weights) stay in Git for reference. **Do not** add `font-cm-*.yaml` for them — that blew the Argo combined manifest budget (~12 MiB of font CMs alone).

Upstream examples: `hinted/ttf/NotoSans/…`, `hinted/ttf/NotoSansMono/…`, `hinted/ttf/NotoSerif/…`.
