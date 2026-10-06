# ADR-0030: CloudNativePG operator

- **Status:** Accepted
- **Datum:** 2026-09-30
- **Kontext:** `apps/infra/cloudnative-pg/`, Issue [HenryHST/minilab#70](https://github.com/HenryHST/minilab/issues/70)

## Kontext

Postgres läuft als StatefulSets (`n8n`, `paperless`) bzw. als CNPG-Cluster (`termix`, `authentik-pg`). Der Operator steht in `cnpg-system`. Termix war der erste Import; Authentik folgte vom Bitnami-Subchart auf Service `authentik-pg-rw` ([ADR-0033](0033-authentik-cnpg.md)).

## Entscheidung

- **Ownership:** ApplicationSet `infra`, Wave 1, native Helm ([ADR-0014](0014-helm-strategie.md), [ADR-0022](0022-apps-bucket-applicationsets.md)). Chart `cloudnative-pg` `0.27.0` (Operator 1.28.0).
- **Namespace:** `cnpg-system` nur für den Operator. Künftige `Cluster` liegen im Namespace der App.
- **RBAC:** ServiceAccount `postgres-cloud-sa`. ClusterRole und ClusterRoleBinding kommen aus dem Chart (CRDs, Pods, PVCs, Secrets, Webhooks, cluster-wide watch). Zusätzlich `cloudnative-pg-volumesnapshot` für `VolumeSnapshot`. `rbac.aggregateClusterRoles: false`.
- **NetworkPolicy:** Ingress Webhook `:9443` (kube-apiserver, beliebige Quelle) und Metrics `:8080` nur aus `monitoring`. Egress DNS sowie TCP 443/6443 zur API. Kein cluster-weites Default-Deny.
- **Metrics:** PodMonitor des Operators mit `release: kube-prometheus-stack`. Instanz-PodMonitore liegen bei der App (Termix: `podmonitor.yaml`). `monitoring.enablePodMonitor` steht auf `false`. PrometheusRule `cnpg-alerts`. Grafana-Dashboard über Application `cnpg-grafana` (Chart `cluster` 0.0.5), nicht über Chart 0.27.0.
- **Zertifikate:** Operator-Webhook bleibt Chart-intern. Der Termix-Cluster nutzt die Operator-Zertifikate, kein cert-manager ([Certificates](https://cloudnative-pg.io/docs/current/certificates)).
- **Capability-Levels:** Der Operator bringt das volle Upstream-Set mit ([capability levels](https://cloudnative-pg.io/docs/current/operator_capability_levels)). Aktiv ist ein Cluster mit einer Instanz.
- **Tests:** Upstream-E2E ([e2e](https://cloudnative-pg.io/docs/current/e2e)) nicht im Homelab. Smoke: Pod Ready, CRD `clusters.postgresql.cnpg.io`, Prometheus-Target.
- **Erster Cluster:** `termix` im Namespace `termix`, Image `ghcr.io/cloudnative-pg/postgresql:16`, 1 Instanz, 1Gi `longhorn`, Requests 100m/512Mi, Limit 1Gi. Der Import (`bootstrap.initdb.import`, `externalClusters`) ist nach dem Cutover aus dem Spec entfernt. Die App liest `DATABASE_URL` auf `termix-rw.termix.svc.cluster.local:5432` mit `sslmode=require`. Node-`pg` braucht zusätzlich `uselibpqcompat=true`, sonst gilt `require` als Zertifikatsprüfung und scheitert an der Operator-CA.
- **Backup:** `VolumeSnapshotClass` `longhorn` (`type: snap`) und `snapshot-controller` v8.6.0 in der Longhorn-App. `ScheduledBackup` `termix-snapshot` alle 6 Stunden, Methode `volumeSnapshot`, online. Das ist kein WAL-Archiv: der Restore-Punkt ist der letzte Snapshot. `pg_dump` nach NFS (`PGHOST=termix-rw`, `PGSSLMODE=require`) bleibt die Kopie außerhalb des Clusters. Der Operator bekommt Snapshot-RBAC über `manifests/rbac-volumesnapshot.yaml`.
- **ServiceAccount:** Der Cluster heißt wie das Helm-ServiceAccount `termix`. Dessen Token-Automount steht auf `true`, die Deployment-Pods setzen `automountServiceAccountToken: false`. Ohne Token bricht der Import mit fehlendem API-Token ab.
- **NetworkPolicy:** Egress des Operators umfasst TCP 8000, sonst bleibt der Cluster auf `Instance Status Extraction Error`.

## Konsequenzen

- Import weiterer Datenbanken ([database import](https://cloudnative-pg.io/docs/current/database_import)) bleibt ein Cutover pro App. Termix ist der Pilot.
- AppProject `infra` erlaubt Destination `cnpg-system`. Das `Cluster`-Manifest liegt bei der App (`apps/dev/termix/cnpg-cluster.yaml`, AppProject `dev`). Der Operator watched cluster-weit.
- Ein `pg_dump` vom Cluster nach `termix-backups` ist durch. hostPath `/var/lib/termix-postgres` auf `nxk3-w01` bleibt als Rückfallebene liegen.
- Snapshots liegen auf den Longhorn-Volumes. Eine Barman-Aufbewahrungsfrist gibt es dafür nicht. `snapshotOwnerReference: backup` löscht den Snapshot zusammen mit dem Backup-Objekt.
