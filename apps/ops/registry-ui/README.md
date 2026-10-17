# registry-ui

[Joxit docker-registry-ui](https://github.com/Joxit/docker-registry-ui) for the in-cluster registry (`kube-registry.kube-system.svc:5000`).

| | |
|---|---|
| Namespace | `registry-ui` |
| Host | `registry-ui.stadthagen.dev` |
| Image | `joxit/docker-registry-ui:2.6.0` |
| Sync wave | `0` (ApplicationSet `ops`) |
| Auth | Authentik ForwardAuth (`manifests/middleware-authentik.yaml`) |

## Behaviour

- Nginx proxies to the existing registry (`NGINX_PROXY_PASS_URL`) so browser HTTPS does not hit the registry over HTTP (no CORS / Mixed Content).
- `REGISTRY_SECURED=false` — no browser Basic Auth dialog. Registry htpasswd is injected server-side as `NGINX_PROXY_HEADER_Authorization` from Secret `registry-ui-proxy-auth` (Infra_LAB `k3s_secrets` / derived `REGISTRY_BASIC_AUTHORIZATION`, user `registry`).
- UI login is **Authentik ForwardAuth** only.
- `DELETE_IMAGES=true` — tag delete from the UI (registry must allow delete; **GC is separate** — see [`apps/ops/registry`](../registry/) CronJob).

## Day-2 secret

After SecretSpec has `REGISTRY_PASSWORD`, apply secrets so `registry-ui/registry-ui-proxy-auth` exists:

```bash
# from Infra_LAB k3s playbook host
ansible-playbook ... --tags secrets
kubectl -n registry-ui rollout restart deploy/registry-ui-user-interface
```

## Authentik ForwardAuth

Middleware is **enabled** on the IngressRoute. Create the Authentik side before or right after sync:

1. Authentik → Proxy Provider for `registry-ui.stadthagen.dev` (forward auth / Traefik mode)
2. Outpost that creates Service `ak-outpost-registry-ui` in namespace `authentik` (port 9000)
3. If the Outpost Service name differs, edit `manifests/middleware-authentik.yaml` `spec.forwardAuth.address`

Until the Outpost is healthy, the UI will return auth errors (expected).

Example scaffolding remains in `authentik-forwardauth.example.yaml` for reference.
