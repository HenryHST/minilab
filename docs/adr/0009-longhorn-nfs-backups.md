# ADR-0009: Longhorn als Default-Storage und NFS-Backups

- **Status:** Accepted
- **Datum:** 2026-09-11
- **Kontext:** `infra/longhorn/`

## Kontext

Der Cluster braucht eine Default-StorageClass für stateful Workloads. Lokale Disks der Worker sollen genutzt werden; Offsite-/NAS-Backups sollen möglich sein.

## Entscheidung

- **Longhorn** als Default-StorageClass (Replicas 3, Data Path `/var/lib/longhorn`).
- Disks nur auf Nodes mit Label `node.longhorn.io/create-default-disk=true` (nxk3-w01–w03).
- Backup-Target: NFS auf UniFi NAS `192.168.0.25` mit **NFSv3** (`nfsvers=3,nolock` — v4 schlägt fehl).
- Ausnahmen bleiben möglich (z. B. Uptime Kuma Local PV, [ADR-0012](0012-uptime-kuma-sqlite-local-pv.md)).

## Konsequenzen

- Stateful Apps defaulten auf Longhorn-PVCs.
- NAS-Export und NFSv3-Optionen sind Teil der Betriebsvoraussetzung.
- App-spezifische Datei-Backups zusätzlich über CronJobs ([ADR-0015](0015-backup-restore-cronjobs.md)).
