# k8s-toolbox

Lab helper image replacing `alpine/k8s` for CronJobs / restore / GC Jobs.

| | |
|--|--|
| Lab image (SoT) | `git.stadthagen.dev/ops/k8s-toolbox` |
| Distribution mirror | `registry.stadthagen.dev/ops/k8s-toolbox` |
| Forgejo repo | https://git.stadthagen.dev/ops/k8s-toolbox |
| Optional GHCR | `ghcr.io/henryhst/k8s-toolbox` (dispatch-only GHA) |
| SemVer | [`VERSION`](VERSION) (current **1.0.2**) |
| Platforms | `linux/amd64` + `linux/arm64` |
| Base | Alpine **3.24** + official `kubectl` v1.37.1 (SHA256-verified) |
| Variants | **full** (default tag `X.Y.Z`) · **slim** (`X.Y.Z-slim`) |
| Clears | GHSA-6q48-6c7w-9gw2, CVE-2025-68121 (vs `alpine/k8s`) |
| CI | Forgejo Actions [`.forgejo/workflows/image.yml`](.forgejo/workflows/image.yml) — sync into Forgejo repo |

## Variants

| Variant | Tag | Contents |
|---------|-----|----------|
| **full** | `1.0.2` | bash, curl, jq, tar/gzip, git, python3+certifi, mariadb-client, postgresql-client, **aws-cli**, kubectl |
| **slim** | `1.0.2-slim` | bash, curl, jq, tar/gzip, wget, ca-certificates, kubectl |

Use **slim** for kubectl-only Jobs (no DB clients / no python in the helper). Do **not** `apk add` DB clients into slim at runtime.

**PG18 clients:** do not `apk add` edge `postgresql18-client` alone on top of full — that leaves `libpq` 17 and breaks `psql`. Use `apk add --upgrade … postgresql18-client libpq` from edge, or a CNPG `postgresql:18` image (Termix pattern).

Not an Argo Application — build artifact only. Consumers pin the SemVer tag in their manifests. SoT version file: [`VERSION`](VERSION). Bump helper: [`scripts/bump-k8s-toolbox-pins.sh`](../../../scripts/bump-k8s-toolbox-pins.sh).

Sources: Forgejo repo is the publish SoT; this tree under `apps/ops/k8s-toolbox/` is kept for VERSION sync, Dockerfile, Forgejo workflow mirror, and local builds.

## Consumer matrix (pin `1.0.2` / `1.0.2-slim`)

| Tag | Workloads |
|-----|-----------|
| **full** | Authentik/BookStack/Paperless/… backup+restore, docs-import, audiobookshelf oidc/email, forgejo-backup, gatus restore, gotenberg-tika-smoke |
| **slim** | registry GC, bookstack theme-sync + copy-shelf-permissions, paperless inbox/mail kubectl wrappers, kubeconfig-user |
| **exception** | Longhorn IM-CPU / Pi-nosched enforcers stay on public `rancher/shell` (sh+kubectl; `rancher/kubectl` is distroless / no `/bin/sh`; no Forgejo pull during storage incidents) |

Pull Secret: `registry-pull` for `git.stadthagen.dev` / `registry.stadthagen.dev`.

## SBOM / verify

Forgejo + GHA builds attach BuildKit **SBOM** + **provenance**. Trivy scans the exported rootfs (FS), not `trivy image` (OCI SBOM false positives).

```bash
crane manifest git.stadthagen.dev/ops/k8s-toolbox:1.0.2
crane manifest git.stadthagen.dev/ops/k8s-toolbox:1.0.2-slim
# Attestations (when registry supports):
#   docker buildx imagetools inspect git.stadthagen.dev/ops/k8s-toolbox:1.0.2 --format '{{json .}}'
```

## Build (local)

```bash
cd apps/ops/k8s-toolbox
VER="$(tr -d '[:space:]' < VERSION)"
for VARIANT in full slim; do
  TAG="${VER}"; [ "${VARIANT}" = slim ] && TAG="${VER}-slim"
  docker buildx build --platform linux/amd64,linux/arm64 \
    --build-arg "VARIANT=${VARIANT}" \
    --build-arg "VERSION=${TAG}" \
    -t "git.stadthagen.dev/ops/k8s-toolbox:${TAG}" \
    -t "registry.stadthagen.dev/ops/k8s-toolbox:${TAG}" \
    --push .
done
```

## Bump

1. Edit `VERSION` here and in https://git.stadthagen.dev/ops/k8s-toolbox (keep Dockerfile / `.forgejo/workflows` in sync)
2. Push to Forgejo `main` (or tag `vX.Y.Z`) — Actions publishes full + slim to both registries
3. Run `scripts/bump-k8s-toolbox-pins.sh` (or bump consumer manifests) to the new SemVer / `-slim` tags
