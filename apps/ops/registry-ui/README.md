# registry-ui

[Joxit docker-registry-ui](https://github.com/Joxit/docker-registry-ui) for the in-cluster registry (`kube-registry.kube-system.svc:5000`).

| | |
|---|---|
| Namespace | `registry-ui` |
| Host | `registry-ui.stadthagen.dev` |
| Chart | [joxit/docker-registry-ui](https://helm.joxit.dev) **1.1.4** |
| Image | `joxit/docker-registry-ui:2.6.0` |
| Sync wave | `0` (ApplicationSet `infra`) |
| Auth | Authentik ForwardAuth (`manifests/middleware-authentik.yaml`) |

## Behaviour

- `ui.proxy: true` → UI nginx proxies to the existing registry (`NGINX_PROXY_PASS_URL`), so browser HTTPS does not hit the registry over HTTP (no CORS / Mixed Content).
- `ui.registrySecured: true` → `REGISTRY_SECURED` — registry uses htpasswd; UI prompts for Basic credentials (user `registry`, same as `docker login`). Separate from Authentik ForwardAuth on the UI host.
- `ui.deleteImages: true` — tag delete from the UI (registry must allow delete; **GC is separate** — see [`apps/ops/registry`](../registry/) CronJob).
- Chart-bundled registry server stays **disabled** (`registry.enabled: false`); the GitOps Deployment from `apps/ops/registry` is used.

## Authentik ForwardAuth

Middleware is **enabled** on the IngressRoute. Create the Authentik side before or right after sync:

1. Authentik → Proxy Provider for `registry-ui.stadthagen.dev` (forward auth / Traefik mode)
2. Outpost that creates Service `ak-outpost-registry-ui` in namespace `authentik` (port 9000)
3. If the Outpost Service name differs, edit `manifests/middleware-authentik.yaml` `spec.forwardAuth.address`

Until the Outpost is healthy, the UI will return auth errors (expected).

Example scaffolding remains in `authentik-forwardauth.example.yaml` for reference.
