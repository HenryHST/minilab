# vw-restore

Vaultwarden restore UI (lab).

- Lab image (SoT): `git.stadthagen.dev/dev/vw-restore:<semver>`
- Forgejo repo: https://git.stadthagen.dev/dev/vw-restore (`.forgejo/workflows/image.yml`)
- Optional GHCR: `ghcr.io/henryhst/vw-restore` (dispatch-only GHA)
- SemVer: file [`VERSION`](VERSION); Forgejo tag `vX.Y.Z` or workflow_dispatch
- Runtime host: `https://vw-restore.stadthagen.dev`

Sources live in the Forgejo repo; this tree under `restore-ui/` is kept for VERSION sync and local builds. K8s manifests stay in minilab.

## Local build

```bash
cd apps/dev/vaultwarden/restore-ui
VER="$(tr -d '[:space:]' < VERSION)"
docker buildx build --platform linux/amd64 \
  -t "git.stadthagen.dev/dev/vw-restore:${VER}" \
  --push .
```

## Deploy note

Cluster pulls `git.stadthagen.dev/dev/vw-restore` via Secret `registry-pull`. Prefer digest pin in Deployment + PreSync Job after a release.
