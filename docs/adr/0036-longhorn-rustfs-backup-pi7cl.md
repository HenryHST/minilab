# ADR-0036: Longhorn BackupTarget → RustFS auf pi7cl

- **Status:** Accepted
- **Datum:** 2026-10-16
- **Kontext:** `apps/infra/longhorn/`, Infra_LAB `henryhst.k3s.rustfs`, Host `pi7cl`

## Kontext

ADR-0009 setzte Longhorn-Backups auf NFS (UniFi NAS `192.168.0.25`). Für ein dediziertes, S3-kompatibles Backup-Ziel auf einem Pi mit lokaler NVMe soll der Store vom Cluster-Replica-Pfad getrennt bleiben (kein Longhorn-PVC für Backup-Daten).

## Entscheidung

- **pi7cl** (Debian 13, `192.168.0.107`) jointd den Cluster als Agent mit Labels `worker` + `storage` — **ohne** `worker=true` / Longhorn-Disk.
- **RustFS** läuft als Host-Docker/systemd auf `/var/lib/rustfs` (Ansible-Rolle `rustfs`, Gruppe `storage`).
- Longhorn `defaultBackupStore`: `s3://longhorn-backups@us-east-1/` + Secret `longhorn-backup-s3` (`AWS_ENDPOINTS=http://192.168.0.107:9000`).
- Gatus prüft `http://192.168.0.107:9000/health`.
- NFS-Ziel bleibt dokumentierter Rollback; keine Auto-Migration alter NFS-Objekte.

## Konsequenzen

- Backup-Verfügbarkeit hängt an pi7cl (Strom/Netz/Disk) — Replicas bleiben 3× auf Proxmox.
- Credentials in SecretSpec (`RUSTFS_*`) und K8s Secret; nicht committen.
- Prometheus-Metriken von RustFS nur über OTLP/OTel (Follow-up); Gatus deckt Health ab.
- ADR-0009 bleibt historisch gültig für NFS; aktuelles Target ist dieses ADR.

## Verweise

- BookStack Longhorn: Kapitel **RustFS Backup Store**
- Diagramm: Infra_LAB `docs/diagrams/archify/longhorn-rustfs-backup`
