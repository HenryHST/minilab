# minilab

GitOps-Manifeste für [Argo CD](https://argo-cd.readthedocs.io/) auf dem **nXk3**-Cluster.

Argo CD Applications werden in Infra_LAB Ansible registriert (`argocd_applications` in `group_vars`). Dieses Repo liefert die Manifeste unter `apps/`.

## Struktur

```
apps/<name>/
  kustomization.yaml   # Kustomize-Einstieg
  …
```

Jeder Ordner ist eine eigenständige App (Deployment/Service/IngressRoute oder Helm via Kustomize `helmCharts`).

## Apps

| App | Pfad | Namespace | Host / Hinweis |
|-----|------|-----------|----------------|
| cert-manager | `apps/cert-manager/` | `certmanager` | Helm via Kustomize (`jetstack/cert-manager` v1.19.0) |
| omni-tools | `apps/omni-tools/` | `omnitools` | `omni-tools.stadthagen.dev` |
| it-tools | `apps/it-tools/` | `it-tools` | `it-tools.stadthagen.dev` |
| pgweb | `apps/pgweb/` | `pgweb` | `pgweb.stadthagen.dev` (Port 8081) |
| web | `apps/web/` | `homepage` | `web.stadthagen.dev` (gethomepage) |
| drawio | `apps/drawio/` | `drawio` | `drawio.stadthagen.dev` (Port 8080) |
| status | `apps/status/` | `uptimekuma` | `status.stadthagen.dev` (Uptime Kuma, Port 3001, hostPath `/var/lib/uptimekuma`) |
| grafana | `apps/grafana/` | `grafana` | `grafana.stadthagen.dev` (Helm chart 10.5.15, Longhorn PVC 5Gi, 1 replica) |
| prometheus | `apps/prometheus/` | `prometheus` | `prometheus.stadthagen.dev` (prom/prometheus:v3.7.1, scrape jobs in `scrape-config.yaml`, Longhorn PVC 5Gi, 1 replica) |
| longhorn | `apps/longhorn/` | `longhorn-system` | `longhorn.stadthagen.dev` (Helm v1.12.1, default StorageClass, backups → NFS `192.168.0.25`) |

`apps/nxk3/` ist für die Umbrella-App `minilab` vorgesehen (optional / noch leer).

Longhorn: Replika-Daten lokal `/var/lib/longhorn` auf Worker mit Label `node.longhorn.io/create-default-disk=true` (nxk3-w01–w03). Backup-Target: `nfs://192.168.0.25:/var/nfs/shared/infra01/longhorn-backups?nfsOptions=nfsvers=3,nolock` (UniFi NAS benötigt NFSv3).

Grafana-Werte basieren auf [JimsGarage GitOps/Grafana](https://github.com/JamesTurland/JimsGarage/tree/main/Kubernetes/GitOps/Grafana) (Helm via Kustomize, Traefik IngressRoute statt Chart-Ingress). Grafana Prometheus-Datasource zeigt auf `http://prometheus.prometheus.svc.cluster.local:9090`.

Scrape-Jobs für Prometheus in `apps/prometheus/scrape-config.yaml` ergänzen (YAML-Liste); Reload per Deployment-Restart oder `/-/reload`.

## Neue App hinzufügen

1. Ordner `apps/<name>/` anlegen mit `kustomization.yaml`, typischerweise `deployment.yaml`, `service.yaml`, `ingressroute.yaml`.
2. Nach `main` pushen.
3. In Infra_LAB unter `argocd_applications` einen Eintrag ergänzen und `ansible-playbook site.yaml --tags argocd --limit nxk3-cp01` ausführen.

## TLS

IngressRoutes referenzieren das Secret `stadthagen-tls` im App-Namespace. Einmalig aus `traefik` kopieren:

```bash
kubectl get secret stadthagen-tls -n traefik -o yaml \
  | sed 's/namespace: traefik/namespace: <APP_NAMESPACE>/' | kubectl apply -f -
```

DNS für App-Hosts → Traefik LB (`192.168.0.215`).
