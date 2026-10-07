---
title: Deploy und Verify
book_version: "1.4.0"
---

# Deploy und Verify

## Voraussetzungen

1. ApplicationSet `infra` enthält `cloudnative-pg` (Wave 1, `extras: true`, Chart `0.27.0`).
2. AppProject `infra` erlaubt Destination `cnpg-system`.
3. Prometheus wählt PodMonitore mit `release: kube-prometheus-stack`.
4. `VolumeSnapshotClass` `longhorn` und Deployment `snapshot-controller` in `longhorn-system` sind da.

## Sync

```bash
kubectl -n argocd get application cloudnative-pg
kubectl -n cnpg-system get pods,sa,networkpolicy,podmonitor
kubectl get crd clusters.postgresql.cnpg.io
```

## Checks

1. Pod des Operators ist Ready, ServiceAccount heißt `postgres-cloud-sa`.
2. CRD `clusters.postgresql.cnpg.io` existiert.
3. PodMonitor `cloudnative-pg` trägt `release: kube-prometheus-stack`.
4. Prometheus-Target für `cnpg-system/cloudnative-pg` ist `up` auf Port 8080.
5. NetworkPolicies `cloudnative-pg` und `cloudnative-pg-instance-status` sind vorhanden.
6. ConfigMap `cnpg-grafana-dashboard` im Namespace `monitoring` trägt `grafana_dashboard=1`.
7. `kubectl get volumesnapshotclass longhorn` zeigt Driver `driver.longhorn.io`.
8. `kubectl -n longhorn-system get deploy snapshot-controller` ist Ready. Danach den Operator einmal neu starten. Er erkennt die VolumeSnapshot-CRD nur beim Start. Ohne Neustart lehnt er `method: volumeSnapshot` ab.

Upstream-E2E läuft im Homelab nicht.

## Trivy RBAC (`cloudnative-pg`)

ClusterRole `cloudnative-pg` (Operator-Chart) bleibt bewusst breit — Abspecken bricht Instance-Lifecycle, Secrets/ConfigMaps, Services, Webhooks und Pod-Exec. Findings in Headlamp sind **akzeptiert** (`cloudnative-pg-edit` / `view` / `volumesnapshot` sind clean):

| Check | Severity | Warum behalten |
|-------|----------|----------------|
| AVD-KSV-0050 | CRITICAL | `roles` / `rolebindings` für Instance-SA im App-Namespace |
| AVD-KSV-0053 | HIGH | `pods/exec` für Jobs/Bootstrap/Diagnostics |
| AVD-KSV-0041 | CRITICAL | `secrets` cluster-weit (DB-Credentials, TLS, app user secrets) |
| AVD-KSV-0049 | MEDIUM | `configmaps` write (Cluster-Konfiguration) |
| AVD-KSV-0056 | HIGH | `services` create/patch (RW/RO/r Services pro Cluster) |
| AVD-KSV-0114 | CRITICAL | Mutating/Validating Webhook Configs get/patch |
| AVD-KSV-0048 | MEDIUM | `pods` / `deployments` create/delete/patch (Instances) |

Kein Bootstrapping-Label → Trivy scannt weiter. Siehe [ADR-0030](../../../adr/0030-cloudnative-pg.md).
