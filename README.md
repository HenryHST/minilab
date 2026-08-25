# minilab

GitOps-Manifeste für [Argo CD](https://argo-cd.readthedocs.io/) auf dem **nXk3**-Cluster.

Ansible legt nur die Parent-Application `homelab` an (`argocd_applications` in Infra_LAB). Child-Applications, Sync Waves und AppProject `infrastruktur` (Anzeige: Infrastruktur) liegen hier unter [`apps/argocd-apps/`](apps/argocd-apps/).

## Struktur

```
apps/argocd-apps/          # App-of-Apps: Application CRs, AppProject, sync-wave
apps/<name>/
  kustomization.yaml       # Kustomize-Einstieg der Workload-App
  …
```

Jeder Ordner unter `apps/<name>/` ist eine eigenständige Workload-App. Registrierung erfolgt über ein Manifest in `apps/argocd-apps/` mit `argocd.argoproj.io/sync-wave`.

### Sync waves

| Wave | Apps |
|------|------|
| 0 | AppProject `infrastruktur` |
| 1 | cert-manager, longhorn, newt |
| 2 | grafana, prometheus, unifipoller, authentik, termix, headlamp |
| 3 | omni-tools, it-tools, pgweb, web, drawio, status, grafana-loki, alertmanager, vaultwarden |

### AppProject `infrastruktur`

`cert-manager`, `longhorn`, `newt`, `grafana`, `grafana-loki`, `alertmanager`, `authentik` — alle anderen Apps nutzen `default`.

## Apps

| App | Pfad | Namespace | Host / Hinweis |
|-----|------|-----------|----------------|
| cert-manager | `apps/cert-manager/` | `certmanager` | Helm via Kustomize (`jetstack/cert-manager` v1.19.0) |
| omni-tools | `apps/omni-tools/` | `omnitools` | `omni-tools.stadthagen.dev` |
| it-tools | `apps/it-tools/` | `it-tools` | `it-tools.stadthagen.dev` |
| pgweb | `apps/pgweb/` | `pgweb` | `pgweb.stadthagen.dev` (Port 8081) |
| web | `apps/web/` | `homepage` | `web.stadthagen.dev` (gethomepage) |
| drawio | `apps/drawio/` | `drawio` | `drawio.stadthagen.dev` (Port 8080) |
| termix | `apps/termix/` | `termix` | `termix.stadthagen.dev` ([Termix](https://github.com/Termix-SSH/Termix) Helm chart + Postgres, 2 replicas, Port 8080; OIDC via Authentik — Secrets `termix-oauth` / `termix-ha` / `termix-db`, Admin-Gruppe `Termix Admins`) |
| headlamp | `apps/headlamp/` | `kube-system` | `headlamp.stadthagen.dev` ([Headlamp](https://kubernetes-sigs.github.io/headlamp/) Helm 0.45.0; Plugin Manager: [cert-manager](https://github.com/headlamp-k8s/plugins/tree/main/cert-manager) 0.1.1, [gatekeeper](https://github.com/open-policy-agent/gatekeeper-headlamp-plugin) 0.2.0) |
| status | `apps/status/` | `uptimekuma` | `status.stadthagen.dev` (Uptime Kuma, Port 3001, hostPath `/var/lib/uptimekuma`; daily NFS backup CronJob → `192.168.0.25:/var/nfs/shared/infra01/uptimekuma-backups`) |
| vaultwarden | `apps/vaultwarden/` | `vaultwarden` | `vaultwarden.stadthagen.dev` (Vaultwarden 1.37.2, Longhorn PVC 2Gi, Authentik SSO; daily NFS backup CronJob → `192.168.0.25:/var/nfs/shared/infra01/vaultwarden-backups`) |
| grafana | `apps/grafana/` | `grafana` | `grafana.stadthagen.dev` (Helm chart 10.5.15, Longhorn PVC 5Gi, 1 replica) |
| prometheus | `apps/prometheus/` | `prometheus` | `prometheus.stadthagen.dev` (prom/prometheus:v3.7.1, scrape jobs in `scrape-config.yaml`, Longhorn PVC 5Gi, 1 replica) |
| longhorn | `apps/longhorn/` | `longhorn-system` | `longhorn.stadthagen.dev` (Helm v1.12.1, default StorageClass, backups → NFS `192.168.0.25`) |

Longhorn: Replika-Daten lokal `/var/lib/longhorn` auf Worker mit Label `node.longhorn.io/create-default-disk=true` (nxk3-w01–w03). Backup-Target: `nfs://192.168.0.25:/var/nfs/shared/infra01/longhorn-backups?nfsOptions=nfsvers=3,nolock` (UniFi NAS benötigt NFSv3).

Uptime Kuma (`status`): CronJob `kuma-backup-cron` (01:00 UTC) tar’t `/app/data` per `kubectl exec` nach NFS `192.168.0.25:/var/nfs/shared/infra01/uptimekuma-backups` (Retention 7). Manuell: `kubectl -n uptimekuma create job --from=cronjob/kuma-backup-cron kuma-backup-manual`.

Vaultwarden: CronJob `vaultwarden-backup-cron` (02:00 UTC) tar’t `/data` per `kubectl exec` nach NFS `192.168.0.25:/var/nfs/shared/infra01/vaultwarden-backups` (Retention 7). Manuell: `kubectl -n vaultwarden create job --from=cronjob/vaultwarden-backup-cron vaultwarden-backup-manual`.

Grafana-Werte basieren auf [JimsGarage GitOps/Grafana](https://github.com/JamesTurland/JimsGarage/tree/main/Kubernetes/GitOps/Grafana) (Helm via Kustomize, Traefik IngressRoute statt Chart-Ingress). Grafana Prometheus-Datasource zeigt auf `http://prometheus.prometheus.svc.cluster.local:9090`.

Scrape-Jobs für Prometheus in `apps/prometheus/scrape-config.yaml` ergänzen (YAML-Liste); Reload per Deployment-Restart oder `/-/reload`.

Headlamp-Login ([Service Account token](https://headlamp.dev/docs/latest/installation/#create-a-service-account-token)): SA `headlamp-admin` mit ClusterRoleBinding `headlamp-admin-ui` → `cluster-admin` (Chart-CRB `headlamp-admin` gilt dem Pod-SA `headlamp`). Long-lived Token in Secret `headlamp-admin-token` (Hülle in Git, Wert nur im Cluster) — Ausgabe in die Login-Maske einfügen:

```bash
# Long-lived Token (Secret headlamp-admin-token)
kubectl -n kube-system get secret headlamp-admin-token -o jsonpath='{.data.token}' | base64 -d

# Alternativ kurzlebig
kubectl create token headlamp-admin -n kube-system
```

## Neue App hinzufügen

1. Ordner `apps/<name>/` anlegen mit `kustomization.yaml`, typischerweise `deployment.yaml`, `service.yaml`, `ingressroute.yaml`.
2. Application-Manifest in `apps/argocd-apps/<name>.yaml` mit passender `sync-wave` (1/2/3) ergänzen und in `kustomization.yaml` listen.
3. Nach `main` pushen; Parent `homelab` synct die Child-App automatisch.

## TLS

IngressRoutes nutzen **cert-manager** (`Certificate` + `ClusterIssuer letsencrypt-prod`). Pro App existiert `certificate.yaml`; das TLS-Secret heißt `<app>-tls` (z. B. `grafana-tls`).

Voraussetzungen:

- Argo-App `cert-manager` synced (Webhook + ClusterIssuer)
- Secret `hetzner` in `certmanager` (Ansible `--tags secrets`)
- DNS A-Record → Traefik LB (`192.168.0.215`)

```bash
kubectl -n grafana get certificate,secret
kubectl get clusterissuer letsencrypt-prod
```

Altes manuelles Kopieren von `stadthagen-tls` aus `traefik` ist nicht mehr nötig.
