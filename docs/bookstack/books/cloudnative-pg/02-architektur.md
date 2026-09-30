---
title: Architektur
book_version: "1.3.0"
---

# Architektur

## Operator

- Helm-Release `cloudnative-pg` aus `https://cloudnative-pg.github.io/charts`, Values `apps/infra/cloudnative-pg/values.yaml`.
- `config.clusterWide: true`. Der Operator sieht `Cluster` in jedem Namespace.
- ServiceAccount `postgres-cloud-sa`. ClusterRole und Binding kommen aus dem Chart. Kein zusätzliches User-ClusterRole. `rbac.aggregateClusterRoles` bleibt aus.
- Requests 50m CPU / 128Mi, Limit 256Mi.
- Webhook-Zertifikate bleiben im Chart (`cnpg-webhook-service:443` → Pod `:9443`). cert-manager für `Cluster.spec.certificates` ist nicht eingerichtet.
- Kein Grafana-Dashboard aus dem Chart (`monitoring.grafanaDashboard.create: false`).

## NetworkPolicy

Pod-Selector `app.kubernetes.io/name=cloudnative-pg`.

| Richtung | Port | Wer |
|----------|------|-----|
| Ingress | 9443 | kube-apiserver, beliebige Quelle |
| Ingress | 8080 | nur Namespace `monitoring` |
| Egress | 53 UDP/TCP | DNS |
| Egress | 443, 6443 | Kubernetes-API |
| Egress | 8000 | Instanz-Status der Cluster |

Die zweite Policy `cloudnative-pg-instance-status` erlaubt 8000 noch einmal. Regeln addieren sich. Ohne 8000 bleibt jeder Cluster auf `Instance Status Extraction Error`.

## Cluster

Ein `Cluster` liegt bei der App, nicht unter `apps/infra/cloudnative-pg/`. Der Name bestimmt die Services `<name>-rw`, `<name>-ro`, `<name>-r`. Die App spricht `<name>-rw` auf Port 5432 mit TLS.

Das ServiceAccount des Clusters heißt wie der Cluster. Kollidiert der Name mit einem bestehenden Konto ohne Token, mounten die Instanz-Pods kein API-Token und der Bootstrap bricht ab.

## Metriken

PodMonitor mit Label `release: kube-prometheus-stack`, Port `metrics` (8080). Dieselbe Label-Pflicht gilt für PodMonitore der Cluster (`monitoring.enablePodMonitor: true`).
