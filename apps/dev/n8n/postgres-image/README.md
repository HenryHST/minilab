# n8n Postgres image (gosu rebuild)

| | |
|--|--|
| Image | `registry.stadthagen.dev/dev/postgres:16.15-alpine-gosu1` |
| Base | `postgres:16.15-alpine` + `gosu` 1.19 built with Go 1.25.7 |
| Clears | CVE-2025-68121 in `/usr/local/bin/gosu` |

```bash
cd apps/dev/n8n/postgres-image
docker buildx build --platform linux/amd64,linux/arm64 \
  -t registry.stadthagen.dev/dev/postgres:16.15-alpine-gosu1 --push .
```
