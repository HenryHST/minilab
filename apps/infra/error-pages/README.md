# error-pages

Clusterweite Maintenance-/Error-Pages für Traefik (`500–504` + unbekannte Hosts).

Upstream: [tarampampam/error-pages](https://github.com/tarampampam/error-pages) · Chart-Pin: `applicationset-infra.yaml` → `helmVersion` · [Traefik guide](https://github.com/tarampampam/error-pages/blob/master/docs/guides/k8s_ingress_traefik.md)

## Deploy

| Stück | Details |
|-------|---------|
| Bucket | `apps/infra/` · ApplicationSet `infra` · AppProject `infra` |
| Namespace | `error-pages` |
| Sync wave | `1` |
| Helm | OCI `ghcr.io/tarampampam/error-pages/charts` → native Argo Helm + `values.yaml` |
| Extras | Catch-all `IngressRoute`, NetworkPolicy, ConfigMap HTML-Template |

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

Middleware Statuscodes: **`500-504`** only (Authentik 401/403 und API-4xx bleiben roh).

## Traefik (Infra_LAB)

Entrypoint-Middleware und `allowCrossNamespace` leben in der Ansible-Traefik-Role (`henryhst.k3s.traefik`), nicht in dieser App.

1. Diese App zuerst syncen (Middleware CRD `error-pages` im NS `error-pages`)
2. Dann: `ansible-playbook site.yaml --tags traefik --limit nxk3-cp01`

Identifier: `error-pages-error-pages@kubernetescrd` auf Entrypoint **websecure**.

## Verify

```bash
kubectl -n error-pages get deploy,svc,middleware,ingressroute,configmap
curl -skL -H 'Accept: text/html' https://no-such.stadthagen.dev/ | grep -E 'badge\.svg|Alle Checks'
```

## Docs

ADR-0024 · BookStack Buch Minilab · Issue [#83](https://github.com/HenryHST/minilab/issues/83).
