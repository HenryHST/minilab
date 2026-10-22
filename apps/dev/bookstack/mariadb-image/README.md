# bookstack MariaDB image (gosu rebuild)

| | |
|--|--|
| Image | `registry.stadthagen.dev/dev/mariadb:11.8.9-gosu1` |
| Base | `mariadb:11.8.9` + `gosu` 1.19 built with Go 1.25.7 |
| Clears | CVE-2025-68121 in `/usr/local/bin/gosu` |

```bash
cd apps/dev/bookstack/mariadb-image
docker buildx build --platform linux/amd64,linux/arm64 \
  -t registry.stadthagen.dev/dev/mariadb:11.8.9-gosu1 --push .
```
