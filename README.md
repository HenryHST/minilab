# minilab

GitOps-Manifeste für [Argo CD](https://argo-cd.readthedocs.io/) auf dem **nXk3**-Cluster.

Ansible legt nur die Parent-Application `homelab` an (`argocd_applications` in Infra_LAB). Child-Applications, Sync Waves und AppProject `infrastruktur` (Anzeige: Infrastruktur) liegen hier unter [`apps/argocd-apps/`](apps/argocd-apps/).

**Wichtig:** Die Parent-App `homelab` muss `targetRevision: main` nutzen (nicht `HEAD`) — sonst schlägt das Laden/Syncen mit `revision HEAD must be resolved` fehl.

**Wichtig:** Die Parent-App `homelab` muss `targetRevision: main` nutzen (nicht `HEAD`) — sonst schlägt das Laden/Syncen u. a. bei Multi-Source-Apps und ApplicationSets mit `revision HEAD must be resolved` fehl.

## Struktur

```
apps/argocd-apps/bootstrap/  # AppProject infrastruktur (via Application infrastruktur-project, wave -2)
apps/argocd-apps/raw/       # ApplicationSet infra (goTemplate — nicht via kustomize build)
apps/argocd-apps/          # Bootstrap: Application-CRs (Plain YAML, kein kustomization.yaml — sonst CMP :8081)
infra/<name>/              # Infrastruktur-Workloads (ApplicationSet „infra“, sync-wave 0)
apps/<name>/               # User-Apps (Plain YAML, kein kustomization.yaml)
  deployment.yaml
  …
```

Infrastruktur-Apps unter `infra/*` werden vom ApplicationSet [`infra`](apps/argocd-apps/raw/infra-applicationset.yaml) über einen expliziten List-Generator registriert (Pfad, Namespace, Sync-Wave pro Eintrag). Das ApplicationSet liegt in `raw/` (goTemplate, kein kustomize build). User-Apps unter `apps/<name>/` weiterhin über Manifeste in `apps/argocd-apps/`.

### Sync waves

| Wave | Apps |
|------|------|
| -2 | Application `infrastruktur-project` → AppProject `infrastruktur` (`apps/argocd-apps/bootstrap/`) |
| 0 | Application `infra-applicationset` → ApplicationSet `infra` (`apps/argocd-apps/raw/`) |
| 1 | ApplicationSet → `infra/longhorn`, `infra/system-upgrade-controller`, `infra/kube-prometheus-stack` |
| 2 | unifipoller, authentik, termix, headlamp |
| 3 | omni-tools, it-tools, pgweb, web, drawio, status, grafana-loki, alloy, vaultwarden, pangolin-publish |

### AppProject `infrastruktur`

ApplicationSet-Apps (`infra/*`) und `pangolin-publish`, `authentik` — alle anderen Apps nutzen `default`.

## Apps

| App | Pfad | Namespace | Host / Hinweis |
|-----|------|-----------|----------------|
| cert-manager | `infra/cert-manager/` | `certmanager` | Native Helm v1.21.1; `ClusterIssuer` via Helm `extraObjects`; webhook: App `cert-manager-webhook-hetzner` |
| metrics-server | `infra/metrics-server/` | `kube-system` | Helm chart 3.14.0; k3s bundled metrics-server disabled; `--kubelet-insecure-tls` |
| registry | `infra/registry/` | `kube-system` | In-cluster registry Service (`kube-registry:5000`) |
| longhorn | `infra/longhorn/` | `longhorn-system` | `longhorn.stadthagen.dev` (Native Helm v1.12.1, default StorageClass, backups → NFS `192.168.0.25`) |
| omni-tools | `apps/omni-tools/` | `omnitools` | `omni-tools.stadthagen.dev` |
| it-tools | `apps/it-tools/` | `it-tools` | `it-tools.stadthagen.dev` |
| pgweb | `apps/pgweb/` | `pgweb` | `pgweb.stadthagen.dev` (Port 8081) |
| web | `apps/web/` | `homepage` | `web.stadthagen.dev` (gethomepage v2.1.2; widgets: Argo CD, Proxmox, Uptime Kuma, Longhorn, Kubernetes, UniFi — Secret `homepage`) |
| drawio | `apps/drawio/` | `drawio` | `drawio.stadthagen.dev` (Port 8080) |
| newt | `infra/newt/` | `newt` | Pangolin Newt tunnel agent (site k3s) |
| pangolin-publish | `apps/pangolin-publish/` | `pangolin-publish` | PostSync Job: Pangolin Integration API upsert — `termix-ext` → Termix ClusterIP; `idp` → Authentik ClusterIP (site k3s) |
| termix | `apps/termix/` | `termix` | `termix.stadthagen.dev` (internal Traefik) + public `termix-ext.stadthagen.dev` via Pangolin; OIDC Authentik — Secrets `termix-oauth` / `termix-ha` / `termix-db`; NetworkPolicy allows traefik + newt |
| headlamp | `apps/headlamp/` | `kube-system` | `headlamp.stadthagen.dev` ([Headlamp](https://kubernetes-sigs.github.io/headlamp/) Helm 0.45.0; Plugin Manager: [cert-manager](https://github.com/headlamp-k8s/plugins/tree/main/cert-manager) 0.1.1, [gatekeeper](https://github.com/open-policy-agent/gatekeeper-headlamp-plugin) 0.2.0) |
| status | `apps/status/` | `uptimekuma` | `status.stadthagen.dev` (Uptime Kuma 2.5.3, **SQLite** auf hostPath `/var/lib/uptimekuma` @ `pi4cl`; daily NFS backup + bootstrap restore → `192.168.0.25:/var/nfs/shared/infra01/uptimekuma-backups`) |
| vaultwarden | `apps/vaultwarden/` | `vaultwarden` | `vaultwarden.stadthagen.dev` (Vaultwarden 1.37.2, Longhorn PVC 2Gi, Authentik SSO; daily NFS backup + bootstrap restore → `192.168.0.25:/var/nfs/shared/infra01/vaultwarden-backups`) |
| kube-prometheus-stack | `infra/kube-prometheus-stack/` | `monitoring` | `grafana.stadthagen.dev`, `prometheus.stadthagen.dev`, `alert-manager.stadthagen.dev` (Helm chart 88.5.4: Prometheus Operator, Grafana, Alertmanager, node-exporter, kube-state-metrics; Longhorn PVC 5Gi / 9d retention; E-Mail alerts) |
| grafana-loki | `infra/loki/` | `monitoring` | `loki.stadthagen.dev` (Helm chart 18.11.7, Longhorn PVC 2Gi) |
| alloy | `infra/alloy/` | `alloy` | Syslog → Loki (`loki-gateway.monitoring.svc.cluster.local`) |
| system-upgrade-controller | `infra/system-upgrade-controller/` | `system-upgrade` | Rancher SUC v0.20.1 (CRDs + Controller, vendored upstream). **Keine** Upgrade-`Plan`s — kein automatisches k3s-Upgrade, bis Plans ergänzt werden. |

Longhorn: Replika-Daten lokal `/var/lib/longhorn` auf Worker mit Label `node.longhorn.io/create-default-disk=true` (nxk3-w01–w03). Backup-Target: `nfs://192.168.0.25:/var/nfs/shared/infra01/longhorn-backups?nfsOptions=nfsvers=3,nolock` (UniFi NAS benötigt NFSv3).

Uptime Kuma (`status`): **SQLite** bewusst (kein MariaDB — siehe [`apps/status/README.md`](apps/status/README.md)). CronJob `kuma-backup-cron` (01:00 UTC) tar’t `/app/data` per `kubectl exec` nach NFS `192.168.0.25:/var/nfs/shared/infra01/uptimekuma-backups` (Retention 7). Manuell: `kubectl -n uptimekuma create job --from=cronjob/kuma-backup-cron kuma-backup-manual`. Deployment + Restore gepinnt auf Node `pi4cl` (hostPath). Bootstrap-Restore: ConfigMap `uptimekuma-restore` → `enabled=true` (bei vorhandener `kuma.db` zusätzlich `force=true`), Argo Sync; danach sofort `enabled=false` committen.

Vaultwarden: CronJob `vaultwarden-backup-cron` (02:00 UTC) tar’t `/data` per `kubectl exec` nach NFS `192.168.0.25:/var/nfs/shared/infra01/vaultwarden-backups` (Retention 7). Manuell: `kubectl -n vaultwarden create job --from=cronjob/vaultwarden-backup-cron vaultwarden-backup-manual`. Bootstrap-Restore (Cluster-Neuaufsetzen): ConfigMap `vaultwarden-restore` → `enabled=true` (bei vorhandener `db.sqlite3` zusätzlich `force=true`), Argo Sync (PostSync-Job skaliert App auf 0, Worker entpackt Archiv auf PVC `vaultwarden-data`); danach sofort `enabled=false` committen. Secrets über SecretSpec: `VAULTWARDEN_OAUTH_CLIENT_SECRET`, `VAULTWARDEN_ADMIN_TOKEN`.

Termix: CronJob `termix-backup-cron` (03:00 UTC) `pg_dump` → NFS `192.168.0.25:/var/nfs/shared/infra01/termix-backups` (Retention 7). Manuell: `kubectl -n termix create job --from=cronjob/termix-backup-cron termix-backup-manual`. Bootstrap-Restore (Cluster-Neuaufsetzen): ConfigMap `termix-restore` → `enabled=true` (bei bereits migrierter DB zusätzlich `force=true`), Argo Sync (PostSync-Job); danach sofort `enabled=false` committen. Secrets müssen über SecretSpec wiederhergestellt werden (`TERMIX_OAUTH_CLIENT_SECRET`, **gleiche** `TERMIX_HA_CRYPTO_HEX` wie beim Backup). NAS-Ordner vorher anlegen: `mkdir -p /var/nfs/shared/infra01/termix-backups`.

Grafana-Werte im kube-prometheus-stack basieren auf [JimsGarage GitOps/Grafana](https://github.com/JamesTurland/JimsGarage/tree/main/Kubernetes/GitOps/Grafana) und [mortennordbye/homelab](https://github.com/mortennordbye/homelab/tree/main/k8s/talos/infra/kube-prometheus-stack) (Helm via Kustomize, Traefik IngressRoute). Grafana Prometheus-Datasource zeigt auf `http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090`.

Login: lokaler Admin **und** Authentik SSO (`oauth_auto_login: false`). Rollen über Authentik-Gruppen `Grafana Admins` → Admin, `Grafana Editors` → Editor, sonst Viewer. Provisionierte Dashboards: UniFi Poller, Argo CD (19993), Authentik (14837), Home Assistant Overview (16888), Proxmox Syslog.

Externe Scrape-Jobs (Proxmox, Pangolin, Home Assistant, Unpoller, Authentik, Argo CD) liegen in `infra/kube-prometheus-stack/values.yaml` unter `prometheus.prometheusSpec.additionalScrapeConfigs`. Custom Alert-Rules: `homelab-alerts.yaml`. Alertmanager: E-Mail an `info@henrystadthagen.de`.

Das Helm-Chart wird über **native Argo-CD-Helm-Quelle** (Multi-Source via ApplicationSet `infra`) gerendert; Extras (Ingress, Certificates, Rules) liegen in `manifests/` als Plain YAML (kein Kustomize — sonst CMP `:8081`).

**Migration:** Secrets `grafana-oauth` und optional `grafana-hcloud` müssen im Namespace `monitoring` existieren (vorher `grafana`). Beispiel: `infra/kube-prometheus-stack/oauth-secret.example.yaml`.

**Migration standalone Application → ApplicationSet `infra`:** Wenn eine App denselben Namen behält (z. B. `longhorn`), kann die alte Application beim Prune in `Terminating` hängen, während das ApplicationSet sie neu anlegt — Fehler `no new finalizers can be added if the object is being deleted`. Workload-Ressourcen bleiben erhalten; nur die Application-CR muss weg:

```bash
kubectl patch application longhorn -n argocd --type merge -p '{"metadata":{"finalizers":null}}'
kubectl -n argocd annotate applicationset infra argocd.argoproj.io/refresh=hard --overwrite
argocd app sync longhorn
```

Optional vor dem Merge: `argocd app delete longhorn --cascade=orphan` (Ressourcen behalten, Application-CR entfernen).

Headlamp-Login ([Service Account token](https://headlamp.dev/docs/latest/installation/#create-a-service-account-token)): SA `headlamp-admin` mit ClusterRoleBinding `headlamp-admin-ui` → `cluster-admin` (Chart-CRB `headlamp-admin` gilt dem Pod-SA `headlamp`). Long-lived Token in Secret `headlamp-admin-token` (Hülle in Git, Wert nur im Cluster) — Ausgabe in die Login-Maske einfügen:

```bash
# Long-lived Token (Secret headlamp-admin-token)
kubectl -n kube-system get secret headlamp-admin-token -o jsonpath='{.data.token}' | base64 -d

# Alternativ kurzlebig
kubectl create token headlamp-admin -n kube-system
```

## Neue App hinzufügen

**Infrastruktur (`infra/`):** Ordner `infra/<name>/` mit Plain YAML anlegen (kein `kustomization.yaml`) und Eintrag in [`apps/argocd-apps/raw/infra-applicationset.yaml`](apps/argocd-apps/raw/infra-applicationset.yaml) (`list` generator: `app`, `path`, `namespace`, `syncWave`) ergänzen. Helm-Apps: Native Helm via ApplicationSet; Git-Extras als Plain Directory in `manifests/`. Ausnahmen: `infra/argocd/` (Bootstrap, später self-managed) und `infra/kargo/` (noch manuell).

**User-App (`apps/`):**

1. Ordner `apps/<name>/` anlegen mit Plain YAML (`deployment.yaml`, `service.yaml`, `ingressroute.yaml`, …) — **`metadata.namespace` in jeder namespaced Resource setzen** (kein `kustomization.yaml`).
2. Helm-Apps (`headlamp`, `termix`, `unifipoller`): Chart in `helm-manifest.yaml` rendern (`helm template …`) und neben Extras committen; Regenerations-Befehl steht im Dateikopf.
3. ConfigMaps: statische `configmap.yaml` statt `configMapGenerator` (z. B. `web` → `configmap.yaml` + `config/*.yaml` als Quelle).
4. Application-Manifest in `apps/argocd-apps/<name>.yaml` mit passender `sync-wave` (1/2/3) ergänzen.
5. Nach `main` pushen; Parent `homelab` synct die Child-App automatisch.

### Langfristig: `infra/argocd/` (homelab-Pattern)

Das [Talos-Homelab](https://github.com/mortennordbye/homelab/tree/main/k8s/talos/infra/argocd) verwaltet Argo CD selbst über `infra/argocd/` (ApplicationSet, AppProjects, …). minilab bootstrapped das ApplicationSet vorerst aus `apps/argocd-apps/`; Ziel ist die vollständige Verlagerung nach `infra/argocd/`.

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

## Troubleshooting (Argo CD)

**`dial tcp …:8081: connect: no route to host` (CMP):** Der repo-server leitet **Kustomize**-Builds an den CMP-Sidecar `:8081` — der ist im Cluster nicht erreichbar. **Lösung:** Plain Directory (kein `kustomization.yaml`); Helm-Charts als `helm template` in `helm-manifest.yaml` committen oder Native Helm via ApplicationSet. Alle minilab-Apps sind migriert. Nach Fix: `kubectl -n argocd annotate applicationset infra argocd.argoproj.io/refresh=hard --overwrite && argocd app sync homelab`

**`AppProject "infrastruktur" not found`:** AppProject liegt in [`apps/argocd-apps/bootstrap/`](apps/argocd-apps/bootstrap/) und wird von `infrastruktur-project` (sync-wave -2) bereitgestellt. Nach Merge: `argocd app sync homelab`. Sofort-Fix:

```bash
kubectl apply -f https://raw.githubusercontent.com/HenryHST/minilab/main/apps/argocd-apps/bootstrap/appproject-infrastruktur.yaml
argocd app sync homelab
```

**`MalformedYAMLError` in `infra-applicationset.yaml`:** goTemplate-Conditionals (`{{- if ... }}`) dürfen nicht inline im `template`-Block stehen — nur in `templatePatch` (mehrzeiliger String). Die Datei liegt in `apps/argocd-apps/raw/`.

**`app is not allowed in project "infrastruktur"` / leerer Namespace:** ApplicationSet `infra` aus `main` syncen. Das Template nutzt `dig "multiSource" false .` — mit `missingkey=error` schlägt `{{- if .multiSource }}` für alle Apps ohne dieses Feld (z. B. `newt`) fehl und erzeugt kaputte Application-Specs. Nach Fix: `kubectl -n argocd annotate applicationset infra argocd.argoproj.io/refresh=hard --overwrite && argocd app sync homelab`

**`Unable to create .../.git/index.lock': File exists`:** Hängender Git-Checkout im repo-server Cache — repo-server neu starten:

```bash
kubectl rollout restart deployment argocd-repo-server -n argocd
```

Falls es danach weiter auftritt, betroffene Cache-Locks im repo-server-Pod entfernen oder den Pod löschen (Cache wird neu aufgebaut).
