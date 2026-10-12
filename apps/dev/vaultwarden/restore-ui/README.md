# vw-restore

Vaultwarden NFS backup restore UI for nXk3.

- Image: `ghcr.io/henryhst/vw-restore:<semver>` (GHCR — lab registry is LAN-only)
- SemVer: file [`VERSION`](VERSION) (source of truth); optional git tag `vw-restore-vX.Y.Z` or workflow_dispatch override
- Also published: `X.Y`, `X`, `latest`, `sha-<short>`
- Runtime host: `https://vw-restore.stadthagen.dev`
- Build: GitHub Actions [vw-restore-image.yml](../../../../.github/workflows/vw-restore-image.yml)
- Supply chain: BuildKit **provenance** + **SBOM**, **Trivy** gate (`CRITICAL`/`HIGH`, ignore unfixed), **Cosign keyless** (GitHub OIDC)

Release: bump `VERSION` + Deployment image digest in the same commit, then push (or tag `vw-restore-v1.0.1`).

```bash
VER=$(tr -d '[:space:]' < VERSION)
docker build \
  --build-arg VERSION="$VER" \
  --build-arg VCS_REF="$(git rev-parse HEAD)" \
  --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t "ghcr.io/henryhst/vw-restore:${VER}" .
```

After the first CI push: GitHub → Packages → `vw-restore` → visibility **Public**.

## Verify (after CI)

```bash
VER=$(tr -d '[:space:]' < VERSION)
DIGEST=$(crane digest "ghcr.io/henryhst/vw-restore:${VER}")

cosign verify \
  --certificate-identity-regexp 'https://github.com/HenryHST/minilab/.github/workflows/vw-restore-image.yml@refs/heads/main' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  "ghcr.io/henryhst/vw-restore:${VER}"

cosign tree "ghcr.io/henryhst/vw-restore@${DIGEST}"
# Expect: signature + SBOM / provenance attestations

# Prefer rootfs/FS scan: `trivy image` merges BuildKit OCI SBOM and can report
# stale phantom packages (FilePath=null). CI uses `crane export` + `trivy fs`.
tmpdir=$(mktemp -d)
crane export --platform linux/amd64 "ghcr.io/henryhst/vw-restore@${DIGEST}" - | tar -x -C "$tmpdir"
trivy fs --severity CRITICAL,HIGH --ignore-unfixed --scanners vuln "$tmpdir"
rm -rf "$tmpdir"
```

## Mirror to lab registry

Cluster pulls `registry.stadthagen.dev/dev/vw-restore` (LAN). After a signed GHCR release, copy **image + signatures/attestations**, then pin the Deployment to the digest:

```bash
VER=$(tr -d '[:space:]' < VERSION)
SRC="ghcr.io/henryhst/vw-restore:${VER}"
DST="registry.stadthagen.dev/dev/vw-restore:${VER}"

# Prefer crane (preserves multi-arch index + referrers when supported)
crane copy "${SRC}" "${DST}"

DIGEST=$(crane digest "${SRC}")
# Update restore-ui-deployment.yaml:
#   image: registry.stadthagen.dev/dev/vw-restore@${DIGEST}
#   # semver: ${VER}
# Keep imagePullPolicy: IfNotPresent when digest-pinned.
```

Verify the lab copy against the same identity (or verify GHCR digest before promote):

```bash
cosign verify \
  --certificate-identity-regexp 'https://github.com/HenryHST/minilab/.github/workflows/vw-restore-image.yml@refs/heads/main' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  "ghcr.io/henryhst/vw-restore@${DIGEST}"
```
