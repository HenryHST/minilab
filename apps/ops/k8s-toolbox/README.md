# k8s-toolbox

Lab helper image replacing `alpine/k8s` for CronJobs / restore / GC Jobs.

| | |
|--|--|
| Lab image (SoT) | `git.stadthagen.dev/ops/k8s-toolbox` |
| Distribution mirror | `registry.stadthagen.dev/ops/k8s-toolbox` |
| Forgejo repo | https://git.stadthagen.dev/ops/k8s-toolbox |
| Optional GHCR | `ghcr.io/henryhst/k8s-toolbox` (dispatch-only GHA) |
| SemVer | [`VERSION`](VERSION) (current **1.0.1**) |
| Platforms | `linux/amd64` + `linux/arm64` |
| Base | Alpine 3.22 + official `kubectl` v1.37.1 + `certifi>=2026.10.19` |
| Clears | GHSA-6q48-6c7w-9gw2, CVE-2025-68121 (vs `alpine/k8s:1.37.1`) |
| Tools | bash, curl, git, jq, python3, mariadb-client, postgresql-client (**17.x** on Alpine 3.22), tar/gzip |
| CI | Forgejo Actions (`.forgejo/workflows/image.yml` in the image repo) |

**PG18 clients:** do not `apk add` edge `postgresql18-client` alone on top of this image — that leaves `libpq` 17 and breaks `psql` (`PQfullProtocolVersion`). Use `apk add --upgrade … postgresql18-client libpq` from edge, or a CNPG `postgresql:18` image (Termix pattern).

Not an Argo Application — build artifact only (like `vw-restore` image). Consumers pin the SemVer tag in their manifests.

Sources live in the Forgejo repo; this tree under `apps/ops/k8s-toolbox/` is kept for VERSION sync and local builds.

## Consumers (pin `1.0.1`)

Backup / restore / jobs under: bookstack, termix, authentik, paperless, audiobookshelf, bytestash, karakeep, vaultwarden, gatus (`status`), longhorn enforcers, registry GC, kubeconfig-user.

Pull Secret: `registry-pull` (Infra_LAB `k3s_secrets` / copy from `kube-system`) for `git.stadthagen.dev` / `registry.stadthagen.dev`.

## Build (local)

```bash
cd apps/ops/k8s-toolbox
VER="$(tr -d '[:space:]' < VERSION)"
docker buildx build --platform linux/amd64,linux/arm64 \
  --build-arg "VERSION=${VER}" \
  -t "git.stadthagen.dev/ops/k8s-toolbox:${VER}" \
  -t "registry.stadthagen.dev/ops/k8s-toolbox:${VER}" \
  --push .
```

## Bump

1. Edit `VERSION` here and in https://git.stadthagen.dev/ops/k8s-toolbox
2. Push to Forgejo `main` (or tag `vX.Y.Z`) — Actions publishes both registries
3. Bump consumer manifests to the new SemVer tag
