# vw-restore

Vaultwarden NFS backup restore UI for nXk3.

- Image: `registry.stadthagen.dev/dev/vw-restore:<semver>`
- Runtime host: `https://vw-restore.stadthagen.dev`
- Build: GitHub Actions [vw-restore-image.yml](../../../../.github/workflows/vw-restore-image.yml)

```bash
docker build \
  --build-arg VERSION=1.0.0 \
  --build-arg VCS_REF="$(git rev-parse HEAD)" \
  --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t registry.stadthagen.dev/dev/vw-restore:1.0.0 .
docker login registry.stadthagen.dev -u registry
docker push registry.stadthagen.dev/dev/vw-restore:1.0.0
```

Repo secrets for CI: `REGISTRY_USERNAME` (`registry`), `REGISTRY_PASSWORD`.
