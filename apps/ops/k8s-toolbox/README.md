# k8s-toolbox

Lab helper image replacing `alpine/k8s` for CronJobs / restore / GC Jobs.

| | |
|--|--|
| GHCR (CI) | `ghcr.io/henryhst/k8s-toolbox` |
| Lab mirror | `registry.stadthagen.dev/ops/k8s-toolbox` |
| SemVer | [`VERSION`](VERSION) (current **1.0.0**) |
| Base | Alpine 3.22 + official `kubectl` v1.37.1 + `certifi>=2026.10.19` |
| Clears | GHSA-6q48-6c7w-9gw2, CVE-2025-68121 (vs `alpine/k8s:1.37.1`) |
| Tools | bash, curl, git, jq, python3, mariadb-client, postgresql-client, tar/gzip |
| CI | [`.github/workflows/k8s-toolbox-image.yml`](../../../.github/workflows/k8s-toolbox-image.yml) |

Not an Argo Application — build artifact only (like `vw-restore` image). Consumers pin the SemVer tag in their manifests.

## Consumers (pin `1.0.0`)

Backup / restore / jobs under: bookstack, termix, authentik, paperless, audiobookshelf, bytestash, karakeep, n8n, vaultwarden, gatus (`status`), longhorn enforcers, registry GC, kubeconfig-user.

All of those Pods need Secret `registry-pull` when pulling from `registry.stadthagen.dev` (Infra_LAB `k3s_secrets` / copy from `kube-system`).

## Build (local)

```bash
cd apps/ops/k8s-toolbox
VER="$(tr -d '[:space:]' < VERSION)"
docker buildx build --platform linux/amd64,linux/arm64 \
  --build-arg "VERSION=${VER}" \
  -t "ghcr.io/henryhst/k8s-toolbox:${VER}" \
  -t "registry.stadthagen.dev/ops/k8s-toolbox:${VER}" \
  --push .
```

## Mirror after GHCR CI

```bash
VER="$(tr -d '[:space:]' < apps/ops/k8s-toolbox/VERSION)"
crane copy \
  "ghcr.io/henryhst/k8s-toolbox:${VER}" \
  "registry.stadthagen.dev/ops/k8s-toolbox:${VER}"
```

## Bump

1. Edit `VERSION` (SemVer).
2. Replace `k8s-toolbox:OLD` → `k8s-toolbox:NEW` across manifests (or wait for Renovate).
3. Merge to `main` (workflow builds/pushes GHCR) → `crane copy` to lab registry.
4. Optional tag: `k8s-toolbox-vX.Y.Z`.
