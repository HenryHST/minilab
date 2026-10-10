# vw-restore

Vaultwarden NFS backup restore UI for nXk3.

- Image: `ghcr.io/henryhst/vw-restore:<semver>` (GHCR — lab registry is LAN-only, GHA cannot push there)
- Runtime host: `https://vw-restore.stadthagen.dev`
- Build: GitHub Actions [vw-restore-image.yml](../../../../.github/workflows/vw-restore-image.yml) (`GITHUB_TOKEN`)

```bash
docker build \
  --build-arg VERSION=1.0.0 \
  --build-arg VCS_REF="$(git rev-parse HEAD)" \
  --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t ghcr.io/henryhst/vw-restore:1.0.0 .
echo "$GHCR_TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
docker push ghcr.io/henryhst/vw-restore:1.0.0
```

After the first CI push: GitHub → Packages → `vw-restore` → Package settings → change visibility to **Public** (cluster pull without pull-secret).
