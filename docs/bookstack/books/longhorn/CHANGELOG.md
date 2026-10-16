# Changelog — Buch Longhorn

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
