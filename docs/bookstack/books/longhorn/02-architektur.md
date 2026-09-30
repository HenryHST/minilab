---
title: Architektur
book_version: "1.0.0"
---

# Architektur

## Laufzeit

- GitOps-App `apps/infra/longhorn`. Chart `v1.12.1` von `https://charts.longhorn.io`, Values `values.yaml`, zusätzliche Manifeste unter `manifests/` (`extras: true`).
- ApplicationSet `infra`, Wave 1, Namespace `longhorn-system`.
- Die StorageClass `longhorn` ist die Default-Klasse. `numberOfReplicas` ist 3. Neue Volumes binden sofort (`volumeBindingMode` Immediate).
- Datenpfad auf dem Node: `/var/lib/longhorn`.
- Disks legt Longhorn nur auf Nodes mit `node.longhorn.io/create-default-disk=true` an. Das sind `nxk3-w01`, `nxk3-w02` und `nxk3-w03`.
- Over-Provisioning steht auf 200 Prozent. Bei 100 Prozent blieb auf den etwa 32Gi-Disks zu wenig planbarer Platz für ein neues PVC.

## UI

Helm-Ingress ist aus. Die IngressRoute `longhorn` auf `traefik-external` reicht `longhorn.stadthagen.dev` an den Service `longhorn-frontend` Port 80 weiter. TLS-Secret `longhorn-tls`, Certificate `longhorn-stadthagen-dev`.

## Metriken

ServiceMonitor mit Label `release: kube-prometheus-stack`.

## Was nicht Longhorn ist

Uptime Kuma bleibt auf einem lokalen Volume ([ADR-0012](../../../adr/0012-uptime-kuma-sqlite-local-pv.md)). App-Dumps nach NFS, zum Beispiel `pg_dump`, sind CronJobs der App ([ADR-0015](../../../adr/0015-backup-restore-cronjobs.md)), nicht das Longhorn-Backup-Target.
