---
title: RustFS Backup Store
book_version: "1.1.0"
---


# RustFS Backup Store (pi7cl)

> **Buch** v1.1.0 · Stand: 2026-10-16

Longhorn speichert Volume-Backups in einem **S3-kompatiblen** Store auf dem Raspberry Pi **pi7cl** (Debian 13, feste IP `192.168.0.107`).

| | |
|--|--|
| Host | `pi7cl` / `192.168.0.107` |
| Inventory | Gruppen `agent`, `raspberrypi`, `storage` |
| Ansible | Role `henryhst.k3s.rustfs` (`--tags rustfs`) |
| Image | `rustfs/rustfs:1.0.1` (Docker auf Host-Disk) |
| Daten | `/var/lib/rustfs/data` — **kein** Longhorn-PVC |
| S3 API | `http://192.168.0.107:9000` |
| Console | `http://192.168.0.107:9001` |
| Bucket | `longhorn-backups` |
| Gatus | Endpoint `rustfs` → `GET /health` → 200 |

Diagramm: Infra_LAB [`longhorn-rustfs-backup`](https://github.com/HenryHST/Infra_LAB/blob/main/docs/diagrams/archify/longhorn-rustfs-backup.html).

## Ownership

- **Replicas** bleiben auf Proxmox-Workern (`worker=true`, Longhorn Disk-Label).
- **pi7cl** hat `node-role.kubernetes.io/worker` + `storage`, **kein** `worker=true`, **kein** `create-default-disk`. CronJob `longhorn-pi-nosched` setzt `allowScheduling=false`.
- Credentials: SecretSpec `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` → Host `/etc/rustfs/rustfs.env` und K8s Secret `longhorn-system/longhorn-backup-s3`.

## BackupTarget

```yaml
defaultBackupStore:
  backupTarget: s3://longhorn-backups@us-east-1/
  backupTargetCredentialSecret: longhorn-backup-s3
```

Secret-Keys: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINTS=http://192.168.0.107:9000`, `AWS_REGION=us-east-1`, `AWS_FORCE_PATH_STYLE=true`.

## Verify

```bash
curl -sf http://192.168.0.107:9000/health
kubectl get node pi7cl -o wide
kubectl -n longhorn-system get secret longhorn-backup-s3
kubectl -n longhorn-system get settings.longhorn.io backup-target -o jsonpath='{.value}{"\n"}'
# Longhorn UI / BackupTarget CR: Available
```

## Rollback (NFS)

```yaml
backupTarget: nfs://192.168.0.25:/var/nfs/shared/infra01/longhorn-backups?nfsOptions=nfsvers=3,nolock
# backupTargetCredentialSecret entfernen
```

Historische NFS-Backup-Objekte können einmalig per `rclone sync` nach `s3://longhorn-backups` übernommen werden (siehe CHANGELOG / Ops-Runbook). NFS bleibt Rollback-Pfad.


## Monitoring

- **Gatus:** HTTP `/health` → 200.
- **Prometheus:** RustFS hat kein natives `/metrics`. OTLP HTTP → otel-collector LoadBalancer `http://192.168.0.219:4318` (`RUSTFS_OBS_ENDPOINT`); Collector exportiert Prometheus auf `:8889` (ServiceMonitor).

## ADR

Siehe minilab [ADR-0036](../../../adr/0036-longhorn-rustfs-backup-pi7cl.md).
