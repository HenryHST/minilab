# ADR-0015: App-Backups per CronJob auf NFS

- **Status:** Accepted
- **Datum:** 2026-09-11
- **Kontext:** status, vaultwarden, termix (u. a.)

## Kontext

Longhorn-Volume-Backups decken nicht alle App-Semantiken ab (SQLite-Dateien, `pg_dump`, konsistente App-Daten). Cluster-Neuaufsetzen braucht einen einfachen Restore-Pfad ohne externe Backup-Suite.

## Entscheidung

- Tägliche **CronJobs** sichern App-Daten auf NFS `192.168.0.25:/var/nfs/shared/infra01/<app>-backups` (Retention typisch 7).
- Muster: oft `kubectl exec` + `tar` bzw. `pg_dump` in Job-Pods.
- **Bootstrap-Restore** über ConfigMap (`*-restore`: `enabled` / optional `force`) und PostSync-Job; nach erfolgreichem Restore sofort `enabled=false` committen.
- Secrets weiterhin über SecretSpecs wiederherstellen (gleiche Crypto-Keys wo nötig, z. B. Termix).

Beispiele: Uptime Kuma 01:00 UTC, Vaultwarden 02:00, Termix 03:00, BookStack 04:00 — Details in den App-READMEs / Root-README.

## Konsequenzen

- NAS-Ordner müssen existieren; NFSv3-Kompatibilität beachten.
- Restore ist bewusst manuell getoggelt (kein stilles Überschreiben).
- Ergänzt, ersetzt aber nicht Longhorn-Backup-Target ([ADR-0009](0009-longhorn-nfs-backups.md)).
