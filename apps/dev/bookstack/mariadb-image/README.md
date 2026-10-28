# bookstack MariaDB image (gosu rebuild)

| | |
|--|--|
| Runtime (interim) | `mariadb:11.8.9` (Docker Hub) in [`mariadb.yaml`](../mariadb.yaml) |
| Target (Forgejo) | `git.stadthagen.dev/dev/mariadb:11.8.9-gosu1` |
| Base | `mariadb:11.8.9` + `gosu` 1.19 built with Go 1.25.7 |
| Clears | CVE-2025-68121 in `/usr/local/bin/gosu` |

Lab Distribution `registry.stadthagen.dev` is no longer used for this image. Publish the rebuild to Forgejo org `dev` (repo `mariadb`, team `registry-pull`), then retarget `mariadb.yaml`.

```bash
cd apps/dev/bookstack/mariadb-image
docker buildx build --platform linux/amd64 \
  -t git.stadthagen.dev/dev/mariadb:11.8.9-gosu1 --push .
```
