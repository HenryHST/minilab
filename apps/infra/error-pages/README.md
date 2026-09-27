# error-pages

Clusterweite Maintenance-/Error-Pages für Traefik (`500–504` + unbekannte Hosts).

Upstream: [tarampampam/error-pages](https://github.com/tarampampam/error-pages) · Chart `4.2.5` · [Traefik guide](https://github.com/tarampampam/error-pages/blob/master/docs/guides/k8s_ingress_traefik.md)

## Deploy

| Stück | Details |
|-------|---------|
| Bucket | `apps/infra/` · ApplicationSet `infra` · AppProject `infra` |
| Namespace | `error-pages` |
| Sync wave | `1` |
| Helm | OCI `ghcr.io/tarampampam/error-pages/charts` → native Argo Helm + `values.yaml` |
| Extras | Catch-all `IngressRoute` (websecure) + NetworkPolicy |

Template: `app-down`. Links: Status (`status.stadthagen.dev`), Home (`web.stadthagen.dev`).

Middleware Statuscodes: **`500-504`** only (Authentik 401/403 und API-4xx bleiben roh).

## Traefik (Infra_LAB)

Entrypoint-Middleware und `allowCrossNamespace` leben in der Ansible-Traefik-Role (`henryhst.k3s.traefik`), nicht in dieser App.

1. Diese App zuerst syncen (Middleware CRD `error-pages` im NS `error-pages`)
2. Dann: `ansible-playbook site.yaml --tags traefik --limit nxk3-cp01`

Identifier: `error-pages-error-pages@kubernetescrd` auf Entrypoint **websecure**.

## Verify

```bash
kubectl -n error-pages get deploy,svc,middleware,ingressroute
curl -skI -H 'Accept: text/html' https://no-such.stadthagen.dev/   # Catch-all 404
# 503: briefly scale a backend to 0, or hit a known failing upstream
```

## Docs

ADR-0024 · BookStack Buch Minilab · Issue [#83](https://github.com/HenryHST/minilab/issues/83).
