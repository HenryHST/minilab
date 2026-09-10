# registry-ui

[Joxit docker-registry-ui](https://github.com/Joxit/docker-registry-ui) for the in-cluster registry (`kube-registry.kube-system.svc:5000`).

| | |
|---|---|
| Namespace | `registry-ui` |
| Host | `registry-ui.stadthagen.dev` |
| Chart | [joxit/docker-registry-ui](https://helm.joxit.dev) **1.1.4** |
| Image | `joxit/docker-registry-ui:2.6.0` |
| Sync wave | `0` (ApplicationSet `infra`) |

## Behaviour

- `ui.proxy: true` → UI nginx proxies to the existing registry (`NGINX_PROXY_PASS_URL`), so browser HTTPS does not hit the registry over HTTP (no CORS / Mixed Content).
- `ui.deleteImages: true` — tag delete from the UI (registry must allow delete; GC is separate).
- Chart-bundled registry server stays **disabled** (`registry.enabled: false`); the cluster Service from `infra/registry` is used instead.

## Authentik (prepared, not enabled)

No auth middleware is active yet. To add Authentik ForwardAuth later:

1. Authentik Proxy Provider + Outpost for `registry-ui.stadthagen.dev`
2. Apply Middleware from `authentik-forwardauth.example.yaml` (as `manifests/middleware-authentik.yaml`)
3. Uncomment `middlewares` on `manifests/ingressroute.yaml`
4. Uncomment Authentik egress in `manifests/networkpolicy.yaml`
