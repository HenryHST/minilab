# vw-restore

Vaultwarden NFS backup restore UI for nXk3.

- Image: `ghcr.io/henryhst/vw-restore:<semver>` (GHCR — lab registry is LAN-only)
- SemVer: file [`VERSION`](VERSION) (source of truth); optional git tag `vw-restore-vX.Y.Z` or workflow_dispatch override
- Also published: `X.Y`, `X`, `latest`, `sha-<short>`
- Runtime host: `https://vw-restore.stadthagen.dev`
- Build: GitHub Actions [vw-restore-image.yml](../../../../.github/workflows/vw-restore-image.yml)

Release: bump `VERSION` + Deployment image tag in the same commit, then push (or tag `vw-restore-v1.0.1`).

```bash
VER=$(tr -d '[:space:]' < VERSION)
docker build \
  --build-arg VERSION="$VER" \
  --build-arg VCS_REF="$(git rev-parse HEAD)" \
  --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t "ghcr.io/henryhst/vw-restore:${VER}" .
```

After the first CI push: GitHub → Packages → `vw-restore` → visibility **Public**.
