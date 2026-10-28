# Changelog — Buch Longhorn

## [1.2.0] - 2026-10-28

### Changed

- Chart pin **v1.12.1 → v1.13.0**
- `storageOverProvisioningPercentage` **200 → 150** (DiskPressure-Prävention; 80G×6 Proxmox-Disk-Nodes)
- Docs: Deploy/Architektur/Übersicht auf v1.13.0

## [1.1.0] - 2026-10-16

### Notes

- NFS-Migration geprüft: Quellpfad `longhorn-backups` leer — kein Objekt-Transfer nötig


### Added

- Kapitel **RustFS Backup Store** (pi7cl, S3, Gatus `/health`)
- ADR-0036: Longhorn BackupTarget → RustFS

### Changed

- Snapshots/Backup und Architektur: Target von NFS auf RustFS S3; NFS als Rollback

## [1.0.3] - 2026-10-13

- Vorheriger Stand (NFS BackupTarget, Snapshots, Onboarding)
