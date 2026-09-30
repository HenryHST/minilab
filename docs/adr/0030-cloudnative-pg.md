# ADR-0030: CloudNativePG operator

- **Status:** Accepted
- **Datum:** 2026-09-30
- **Kontext:** `apps/infra/cloudnative-pg/`, Issue [HenryHST/minilab#70](https://github.com/HenryHST/minilab/issues/70)

## Kontext

Postgres läuft heute als StatefulSets (`n8n`, `paperless`, `termix`) bzw. als Authentik-Helm-Subchart. Ein Operator soll später `Cluster`-CRs, Import und Backups ermöglichen. Dieser Schritt installiert nur den Operator — Longhorn hat wenig freien Platz (`n8n` nutzt hostPath), eine Migration wäre ein eigener Cutover.

## Entscheidung

- **Ownership:** ApplicationSet `infra`, Wave 1, native Helm ([ADR-0014](0014-helm-strategie.md), [ADR-0022](0022-apps-bucket-applicationsets.md)). Chart `cloudnative-pg` `0.27.0` (Operator 1.28.0).
- **Namespace:** `cnpg-system` nur für den Operator. Künftige `Cluster` liegen im Namespace der App.
- **RBAC:** ServiceAccount `postgres-cloud-sa`. ClusterRole und ClusterRoleBinding kommen aus dem Chart (CRDs, Pods, PVCs, Secrets, Webhooks, cluster-wide watch). Kein zusätzliches User-ClusterRole. `rbac.aggregateClusterRoles: false`.
- **NetworkPolicy:** Ingress Webhook `:9443` (kube-apiserver, beliebige Quelle) und Metrics `:8080` nur aus `monitoring`. Egress DNS sowie TCP 443/6443 zur API. Kein cluster-weites Default-Deny.
- **Metrics:** PodMonitor mit `release: kube-prometheus-stack`. Kein Grafana-Dashboard, solange kein Cluster existiert.
- **Zertifikate:** Operator-Webhook bleibt Chart-intern. cert-manager für `Cluster.spec.certificates` erst mit dem ersten Cluster ([Certificates](https://cloudnative-pg.io/docs/current/certificates)).
- **Capability-Levels:** Der Operator bringt das volle Upstream-Set mit ([capability levels](https://cloudnative-pg.io/docs/current/operator_capability_levels)). Ohne `Cluster` sind Replikation, Backup und Major-Upgrade nicht aktiv.
- **Tests:** Upstream-E2E ([e2e](https://cloudnative-pg.io/docs/current/e2e)) nicht im Homelab. Smoke: Pod Ready, CRD `clusters.postgresql.cnpg.io`, Prometheus-Target.

## Konsequenzen

- Import bestehender Datenbanken ([database import](https://cloudnative-pg.io/docs/current/database_import)) ist ein Folgeschritt pro App, nicht Teil dieses Deploys.
- AppProject `infra` erlaubt Destination `cnpg-system`. `Cluster`-Manifeste in App-Namespaces gehören später in das jeweilige App-Projekt (`dev` / `ops`); der Operator watched sie cluster-weit.
