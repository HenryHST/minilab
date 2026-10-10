# minilab

GitOps-Manifeste für [Argo CD](https://argo-cd.readthedocs.io/) auf dem **nXk3**-Cluster.

**Architekturentscheidungen:** [`docs/adr/`](docs/adr/) (ADRs zu GitOps, Plain YAML, ApplicationSet, TLS, Storage, IdP, Pangolin, Alerting, …).

Ansible legt nur die Parent-Application `homelab` an (`argocd_applications` in Infra_LAB). Bootstrap, AppProjects und ApplicationSets liegen hier unter [`apps/argocd-apps/`](apps/argocd-apps/). Workloads unter [`apps/{infra,monitoring,ops,dev}/`](apps/) — siehe [ADR-0022](docs/adr/0022-apps-bucket-applicationsets.md).

**Wichtig:** Die Parent-App `homelab` muss `targetRevision: main` nutzen (nicht `HEAD`) — sonst schlägt das Laden/Syncen u. a. bei Multi-Source-Apps und ApplicationSets mit `revision HEAD must be resolved` fehl.

## Struktur

```
apps/argocd-apps/           # Bootstrap Application gitops-bootstrap (Plain YAML)
apps/argocd-apps/raw/       # AppProjects + 4 ApplicationSets (goTemplate — nicht via kustomize build)
apps/infra/<name>/          # Storage / Timezone (ApplicationSet infra)
apps/monitoring/<name>/     # Metrics / Logs / Status (ApplicationSet monitoring)
apps/ops/<name>/            # Platform / IdP / Edge (ApplicationSet ops)
apps/dev/<name>/            # User tooling (ApplicationSet dev)
```

Vier ApplicationSets (`infra`, `monitoring`, `ops`, `dev`) registrieren Workloads über List-Generatoren (Pfad, Namespace, Sync-Wave, optional Helm). Bootstrap-Application **`gitops-bootstrap`** (project `default`) synct `raw/`. Application-Namen bleiben stabil (`unifipoller`, `grafana-loki`, …).

### Sync waves

| Wave | Apps |
|------|------|
| -2 | AppProjects `infra` / `monitoring` / `ops` / `dev` (via `gitops-bootstrap` → `raw/`) |
| 0 | `gitops-bootstrap` → ApplicationSets; cert-manager, metrics-server, registry, newt, … |
| 1 | longhorn, k8tz, kube-prometheus-stack, system-upgrade-controller, cert-manager-webhook |
| 2 | unifipoller, authentik, termix, headlamp, hubble-ui |
| 3 | Dev-Tools, grafana-loki, alloy, vaultwarden, bookstack, pangolin-publish, … |

### AppProjects

Je Bucket ein AppProject mit Destination-Namespace-Allowlist (`infra`, `monitoring`, `ops`, `dev`). Kein monolithisches `infrastruktur` mehr.

## Apps

| App | Pfad | Namespace | Host / Hinweis |
|-----|------|-----------|----------------|
| cert-manager | `apps/ops/cert-manager/` | `certmanager` | Native Helm v1.21.1; `ClusterIssuer` via Helm `extraObjects`; webhook: App `cert-manager-webhook-hetzner` |
| metrics-server | `apps/monitoring/metrics-server/` | `kube-system` | Helm chart 3.14.0; k3s bundled metrics-server disabled; `--kubelet-insecure-tls` |
| registry | `apps/ops/registry/` | `kube-system` | Distribution `registry:3` — ClusterIP `kube-registry:5000`, PVC 50Gi Longhorn, weekly GC, `registry.stadthagen.dev` |
| registry-ui | `apps/ops/registry-ui/` | `registry-ui` | `registry-ui.stadthagen.dev` ([Joxit](https://github.com/Joxit/docker-registry-ui) Helm 1.1.4 / image 2.6.0; proxies `kube-registry:5000`; Authentik ForwardAuth aktiv) |
| longhorn | `apps/infra/longhorn/` | `longhorn-system` | `longhorn.stadthagen.dev` (Native Helm v1.12.1, default StorageClass, backups → NFS `192.168.0.25`) |
| omni-tools | `apps/dev/omni-tools/` | `omnitools` | `omni-tools.stadthagen.dev` |
| it-tools | `apps/dev/it-tools/` | `it-tools` | `it-tools.stadthagen.dev` |
| pgweb | `apps/dev/pgweb/` | `pgweb` | `pgweb.stadthagen.dev` (Port 8081) |
| web | `apps/dev/web/` | `homepage` | `web.stadthagen.dev` (gethomepage v2.1.2; widgets: Argo CD, Proxmox, Longhorn, Kubernetes, UniFi — Secret `homepage`; Link auf Gatus) |
| drawio | `apps/dev/drawio/` | `drawio` | `drawio.stadthagen.dev` (Port 8080) |
| newt | `apps/ops/newt/` | `newt` | Pangolin Newt tunnel agent (site k3s) |
| pangolin-publish | `apps/ops/pangolin-publish/` | `pangolin-publish` | PostSync Job: Pangolin Integration API upsert — `termix-ext` → Termix ClusterIP; `idp` → Authentik ClusterIP (site k3s) |
| wud | `apps/ops/wud/` | `wud` | `wupd.stadthagen.dev` ([WUD](https://getwud.app) 9.3.0, notify-only: Kubernetes watcher + `registry.stadthagen.dev` → Pushover + MQTT/HA; OIDC Authentik — Secret `wud-env`) |
| termix | `apps/dev/termix/` | `termix` | `termix.stadthagen.dev` (internal Traefik) + public `termix-ext.stadthagen.dev` via Pangolin; OIDC Authentik — Secrets `termix-oauth` / `termix-ha` / `termix-db`; NetworkPolicy allows traefik + newt |
| headlamp | `apps/ops/headlamp/` | `kube-system` | `headlamp.stadthagen.dev` ([Headlamp](https://kubernetes-sigs.github.io/headlamp/) Helm 0.45.0; Plugin Manager: [cert-manager](https://github.com/headlamp-k8s/plugins/tree/main/cert-manager) 0.1.1, [gatekeeper](https://github.com/open-policy-agent/gatekeeper-headlamp-plugin) 0.2.0) |
| gatus | `apps/monitoring/gatus/` | `status` | `status.stadthagen.dev` (Gatus Helm 1.5.0 / v5.34.0, CloudNativePG PG 16, Authentik OIDC, Pushover; `pg_dump` 01:00 UTC → `192.168.0.25:/var/nfs/shared/infra01/gatus-backups`) |
| vaultwarden | `apps/dev/vaultwarden/` | `vaultwarden` | `vw-ext` + LAN redirect; Restore-UI `vw-restore.stadthagen.dev`; Cron 02:00+14:00 UTC NFS backup (Retention 14) → `192.168.0.25:/var/nfs/shared/infra01/vaultwarden-backups` |
| bookstack | `apps/dev/bookstack/` | `bookstack` | `book.stadthagen.dev` (BookStack via gabe565 Helm → `helm-manifest.yaml`, MariaDB hostPath @ `nxk3-w01`, Authentik OIDC, SMTP vorbereitet; daily NFS backup + bootstrap restore → `192.168.0.25:/var/nfs/shared/infra01/bookstack-backups`; Inhalte unter `docs/bookstack/`) |
| kube-prometheus-stack | `apps/monitoring/kube-prometheus-stack/` | `monitoring` | `grafana.stadthagen.dev`, `prometheus.stadthagen.dev`, `alert-manager.stadthagen.dev` (Helm chart 88.5.4: Prometheus Operator, Grafana, Alertmanager, node-exporter, kube-state-metrics; Longhorn PVC 5Gi / 9d retention; E-Mail alerts) |
| grafana-loki | `apps/monitoring/loki/` | `monitoring` | `loki.stadthagen.dev` (Helm chart 18.11.7, Longhorn PVC 2Gi) |
| alloy | `apps/monitoring/alloy/` | `alloy` | Syslog → Loki (`loki-gateway.monitoring.svc.cluster.local`) |
| system-upgrade-controller | `apps/ops/system-upgrade-controller/` | `system-upgrade` | Rancher SUC v0.20.1 (CRDs + Controller, vendored upstream). **Keine** Upgrade-`Plan`s — kein automatisches k3s-Upgrade, bis Plans ergänzt werden. |

Longhorn: Replika-Daten lokal `/var/lib/longhorn` auf Worker mit Label `node.longhorn.io/create-default-disk=true` (nxk3-w01–w03). Backup-Target: `nfs://192.168.0.25:/var/nfs/shared/infra01/longhorn-backups?nfsOptions=nfsvers=3,nolock` (UniFi NAS benötigt NFSv3).

Gatus (`status.stadthagen.dev`): Helm-Chart 1.5.0, Historie in CloudNativePG (`gatus-rw`, `sslmode=require`). CronJob `gatus-backup-cron` (01:00 UTC) schreibt `pg_dump` nach NFS `192.168.0.25:/var/nfs/shared/infra01/gatus-backups` (Retention 7). Manuell: `kubectl -n status create job --from=cronjob/gatus-backup-cron gatus-backup-manual`. Zusätzlich Longhorn-Snapshot `gatus-snapshot` alle 6h. Bootstrap-Restore: ConfigMap `gatus-restore` → `enabled=true` (bei vorhandenen Tabellen zusätzlich `force=true`), Argo Sync; danach sofort `enabled=false` committen. Secrets: SecretSpec `GATUS_DB_PASSWORD`, `GATUS_OAUTH_CLIENT_SECRET`, `GATUS_PUSHOVER_APP_TOKEN`, `PUSHOVER_USER_KEY`. NAS: `mkdir -p /var/nfs/shared/infra01/gatus-backups`. Details: [`apps/monitoring/gatus/README.md`](apps/monitoring/gatus/README.md), [ADR-0034](docs/adr/0034-gatus-cnpg.md).

Vaultwarden: CronJob `vaultwarden-backup-cron` (`0 2,14 * * *`) tar’t `/data` per `kubectl exec` nach NFS `192.168.0.25:/var/nfs/shared/infra01/vaultwarden-backups` (Retention 14). Manuell: Argo CD **Create Job** am CronJob oder `kubectl -n vaultwarden create job --from=cronjob/vaultwarden-backup-cron vaultwarden-backup-manual`. Restore-UI: `https://vw-restore.stadthagen.dev` (ForwardAuth, `vaultwarden_admins`, Image `ghcr.io/henryhst/vw-restore:1.0.0`, Quelle `apps/dev/vaultwarden/restore-ui/`, GHA → GHCR). Bootstrap-Restore: ConfigMap `vaultwarden-restore` → `enabled=true` (+ ggf. `force=true`), Argo Sync; danach `enabled=false`. Secrets: `VAULTWARDEN_OAUTH_CLIENT_SECRET`, `VAULTWARDEN_ADMIN_TOKEN`.

Termix: CronJob `termix-backup-cron` (03:00 UTC) `pg_dump` → NFS `192.168.0.25:/var/nfs/shared/infra01/termix-backups` (Retention 7). Manuell: `kubectl -n termix create job --from=cronjob/termix-backup-cron termix-backup-manual`. Bootstrap-Restore (Cluster-Neuaufsetzen): ConfigMap `termix-restore` → `enabled=true` (bei bereits migrierter DB zusätzlich `force=true`), Argo Sync (PostSync-Job); danach sofort `enabled=false` committen. Secrets müssen über SecretSpec wiederhergestellt werden (`TERMIX_OAUTH_CLIENT_SECRET`, **gleiche** `TERMIX_HA_CRYPTO_HEX` wie beim Backup). NAS-Ordner vorher anlegen: `mkdir -p /var/nfs/shared/infra01/termix-backups`.

BookStack: CronJob `bookstack-backup-cron` (04:00 UTC) sichert MariaDB-Dump + `/config` nach NFS `192.168.0.25:/var/nfs/shared/infra01/bookstack-backups` (Retention 7). Manuell: `kubectl -n bookstack create job --from=cronjob/bookstack-backup-cron bookstack-backup-manual`. Bootstrap-Restore: ConfigMap `bookstack-restore` → `enabled=true` (bei vorhandener DB zusätzlich `force=true`), Argo Sync (PostSync-Job); danach sofort `enabled=false` committen. Secrets: `bookstack-app` / `bookstack-db` / `bookstack-oauth` / `bookstack-smtp`. NAS: `mkdir -p /var/nfs/shared/infra01/bookstack-backups`. Git-Inhalte & Import: [`docs/bookstack/`](docs/bookstack/).

Authentik: CronJob `authentik-backup-cron` (05:00 UTC) sichert `pg_dump` + `/media` nach NFS `192.168.0.25:/var/nfs/shared/infra01/authentik-backups` (Retention 7). Manuell: `kubectl -n authentik create job --from=cronjob/authentik-backup-cron authentik-backup-manual`. Bootstrap-Restore: ConfigMap `authentik-restore` → `enabled=true` (bei vorhandener DB/Media zusätzlich `force=true`), Argo Sync; danach sofort `enabled=false` committen. Branding-Media-Sync bleibt separat (≠ Backup). Secrets: SecretSpec `authentik-credentials`. NAS: `mkdir -p /var/nfs/shared/infra01/authentik-backups`.

ByteStash: CronJob `bytestash-backup-cron` (06:00 UTC) tar’t `/data/snippets` nach NFS `192.168.0.25:/var/nfs/shared/infra01/bytestash-backups` (Retention 7). Manuell: `kubectl -n bytestash create job --from=cronjob/bytestash-backup-cron bytestash-backup-manual`. Bootstrap-Restore: ConfigMap `bytestash-restore` → `enabled=true` (bei vorhandenen Snippets zusätzlich `force=true`), Argo Sync; danach sofort `enabled=false` committen. Secrets: `bytestash-oauth` / `bytestash-jwt`. NAS: `mkdir -p /var/nfs/shared/infra01/bytestash-backups`.

Grafana-Werte im kube-prometheus-stack basieren auf [JimsGarage GitOps/Grafana](https://github.com/JamesTurland/JimsGarage/tree/main/Kubernetes/GitOps/Grafana) und [mortennordbye/homelab](https://github.com/mortennordbye/homelab/tree/main/k8s/talos/apps/monitoring/kube-prometheus-stack) (Helm via Kustomize, Traefik IngressRoute). Grafana Prometheus-Datasource zeigt auf `http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090`.

Login: lokaler Admin **und** Authentik SSO (`oauth_auto_login: false`). Rollen über Authentik-Gruppen `Grafana Admins` → Admin, `Grafana Editors` → Editor, sonst Viewer. Provisionierte Dashboards: UniFi Poller, Argo CD (19993), Authentik (14837), Home Assistant Overview (16888), Proxmox Syslog.

Externe Scrape-Jobs (Proxmox, Pangolin, Home Assistant, Unpoller, Authentik, Argo CD) liegen in `apps/monitoring/kube-prometheus-stack/values.yaml` unter `prometheus.prometheusSpec.additionalScrapeConfigs`. Custom Alert-Rules: `homelab-alerts.yaml`. Alertmanager: E-Mail an `info@henrystadthagen.de` mit getrennten Routes für `critical` / `warning`.

**Baseline Alerting (V1+V2):** PrometheusRules (Workload, Proxmox, **Cilium**) + Loki Ruler (Proxmox syslog) → Alertmanager. Cilium scrape via `cilium-podmonitors.yaml` (Ports 9962/9963/9965; Cilium-Helm `prometheus.enabled` nötig). Design, Severity-Matrix, Testing und Runbook → [`apps/monitoring/kube-prometheus-stack/ALERTING.md`](apps/monitoring/kube-prometheus-stack/ALERTING.md). Tests: `apps/monitoring/kube-prometheus-stack/tests/run-tests.sh`.

Das Helm-Chart wird über **native Argo-CD-Helm-Quelle** (Multi-Source via ApplicationSets) gerendert; Extras (Ingress, Certificates, Rules) liegen in `manifests/` als Plain YAML (kein Kustomize — sonst CMP `:8081`).

**Migration:** Secrets `grafana-oauth` und optional `grafana-hcloud` müssen im Namespace `monitoring` existieren (vorher `grafana`). Beispiel: `apps/monitoring/kube-prometheus-stack/oauth-secret.example.yaml`.

**Migration / orphan-delete (Finalizer):** Wenn eine App denselben Namen behält (z. B. `longhorn`), kann die alte Application beim Prune in `Terminating` hängen, während das ApplicationSet sie neu anlegt — Fehler `no new finalizers can be added if the object is being deleted`. Workload-Ressourcen bleiben erhalten; nur die Application-CR muss weg:

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

1. Passenden Bucket wählen (`apps/infra|monitoring|ops|dev/<name>/`) und Plain YAML anlegen (kein `kustomization.yaml`) — **`metadata.namespace` in jeder namespaced Resource setzen**.
2. Helm: Native Argo-Helm im ApplicationSet (values unter dem Bucket) **oder** Chart → `helm-manifest.yaml` committen (Regenerations-Befehl im Dateikopf).
3. Listeneintrag in `apps/argocd-apps/raw/applicationset-<bucket>.yaml` (`app`, `namespace`, `syncWave`, optional Helm-Felder / `path` + `extras`).
4. Nach `main` pushen; Parent `homelab` → `gitops-bootstrap` → ApplicationSet erzeugt die Application.

Stubs ohne Deploy: Ordner anlegen, **nicht** in die ApplicationSet-Liste aufnehmen (`kargo`).

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

**`dial tcp …:8081: connect: no route to host` (CMP):** Der repo-server leitet **Kustomize**-Builds an den CMP-Sidecar `:8081` — der ist im Cluster nicht erreichbar. **Lösung:** Plain Directory (kein `kustomization.yaml`); Helm-Charts als `helm template` in `helm-manifest.yaml` committen oder Native Helm via ApplicationSet. Alle minilab-Apps sind migriert. Nach Fix: `kubectl -n argocd annotate applicationset infra monitoring ops dev argocd.argoproj.io/refresh=hard --overwrite && argocd app sync homelab`

**`app is not allowed in project` / `AppProject not found`:** AppProjects liegen in `apps/argocd-apps/raw/appproject-*.yaml` und werden von Application `gitops-bootstrap` (project `default`, sync-wave -2) bereitgestellt:

```bash
argocd app sync gitops-bootstrap
kubectl apply -f https://raw.githubusercontent.com/HenryHST/minilab/main/apps/argocd-apps/raw/appproject-infra.yaml
kubectl -n argocd annotate applicationset infra argocd.argoproj.io/refresh=hard --overwrite
argocd app sync longhorn
```

Altes AppProject `infrastruktur` / Application `infra-applicationset` orphan löschen falls noch vorhanden.

**`MalformedYAMLError` in `applicationset-*.yaml`:** goTemplate-Conditionals nur in `templatePatch` (mehrzeiliger String), nicht inline im `template`-Block.

**ApplicationSet erzeugt kaputte Specs / leerer Namespace:** Templates nutzen `dig "helmChart" "" .`. Nach Fix: `kubectl -n argocd annotate applicationset infra monitoring ops dev argocd.argoproj.io/refresh=hard --overwrite && argocd app sync homelab`

**`Unable to create .../.git/index.lock': File exists`:** Hängender Git-Checkout im repo-server Cache — repo-server neu starten:

```bash
kubectl rollout restart deployment argocd-repo-server -n argocd
```

Falls es danach weiter auftritt, betroffene Cache-Locks im repo-server-Pod entfernen oder den Pod löschen (Cache wird neu aufgebaut).
