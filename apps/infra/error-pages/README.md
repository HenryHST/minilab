# error-pages

Clusterweite Maintenance-/Error-Pages für den Cilium Gateway edge (`404`, `500–504` via Envoy CEC in Infra_LAB).

Upstream: [tarampampam/error-pages](https://github.com/tarampampam/error-pages) · Chart-Pin: `applicationset-infra.yaml` → `helmVersion`

Wiring: [ADR-0024](../../../docs/adr/0024-error-pages.md), [ADR-0038](../../../docs/adr/0038-cilium-gateway-api.md). Traefik Middleware / HostRegexp-Catch-all removed.

## Deploy

| Stück | Details |
|-------|---------|
| Bucket | `apps/infra/` · ApplicationSet `infra` · AppProject `infra` |
| Namespace | `error-pages` |
| Sync wave | `1` |
| Helm | OCI `ghcr.io/tarampampam/error-pages/charts` → native Argo Helm + `values.yaml` |
| Extras | NetworkPolicy, ConfigMap HTML-Template (kein IngressRoute) |

## Template + Gatus-Badges

Custom HTML: `lost-in-space` + Kern-Health-Badges (Browser lädt öffentliche Gatus-SVGs).

| Datei | Rolle |
|-------|-------|
| `templates/lost-in-space-gatus.tpl.html` | SoT für Markup |
| `manifests/configmap-template.yaml` | ConfigMap → Mount `/templates` |
| `values.yaml` | `htmlTemplate.custom` + volumes |

Badges (Keys): `homelab_authentik`, `apps_homepage`, `apps_vaultwarden`, `plattform_argocd`, `plattform_grafana`, `plattform_prometheus`, `plattform_forgejo`, `apps_longhorn`, `storage_rustfs`, `extern_pangolin`.  
Link „Alle Checks“ / Status-Nav → `https://status.stadthagen.dev/uebersicht`. Kein Kromgo (LAN-only).

Nach Template-Edit ConfigMap neu erzeugen:

```bash
cd apps/infra/error-pages
kubectl create configmap error-pages-html-template \
  --from-file=lost-in-space-gatus.tpl.html=templates/lost-in-space-gatus.tpl.html \
  --namespace=error-pages --dry-run=client -o yaml \
  | sed '/creationTimestamp/d' > manifests/configmap-template.yaml
# labels + sync-wave annotation wieder setzen (siehe bestehende CM-YAML)
```

## Smoke (nach Gateway-Cutover)

```bash
# Backend up
kubectl -n error-pages get svc error-pages
# CEC present (Infra_LAB)
kubectl -n gateway-system get cec
# Force 404 via unknown path on a known host (expects styled page if CEC wired)
curl -skI https://web.stadthagen.dev/__no_such_path__ | head
```
