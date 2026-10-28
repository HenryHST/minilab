# ADR-0015: App-Backups per CronJob auf NFS

- **Status:** Accepted
- **Datum:** 2026-09-11 (ergänzt 2026-09-27; Paperless Exporter 2026-10-25)
- **Kontext:** gatus, vaultwarden, termix, bookstack, authentik, bytestash, paperless

## Kontext

Longhorn-Volume-Backups decken nicht alle App-Semantiken ab (SQLite-Dateien, `pg_dump`, konsistente App-Daten). Cluster-Neuaufsetzen braucht einen einfachen Restore-Pfad ohne externe Backup-Suite.

## Entscheidung

- Tägliche **CronJobs** sichern App-Daten auf NFS `192.168.0.25:/var/nfs/shared/infra01/<app>-backups` (Retention typisch 7).
- Muster: oft `kubectl exec` + `tar` bzw. `pg_dump` in Job-Pods.
- **Bootstrap-Restore** über ConfigMap (`*-restore`: `enabled` / optional `force`) und PostSync-Job; nach erfolgreichem Restore sofort `enabled=false` committen.
- Secrets weiterhin über SecretSpecs wiederherstellen (gleiche Crypto-Keys wo nötig, z. B. Termix).

### Zeitplan (UTC)

| App | Cron | Inhalt |
|-----|------|--------|
| gatus | 01:00 | `pg_dump` |
| vaultwarden | 02:00 | tar `/data` |
| termix | 03:00 | `pg_dump` |
| bookstack | 04:00 | MariaDB + `/config` |
| **authentik** | **02:30 + 11:50 Europe/Berlin** (scale-to-0) | `pg_dump` + `/media` → NFS **and** RustFS S3 `authentik-backups` (retention 30d) |
| **bytestash** | **06:00** | tar `/data/snippets` |
| **paperless** | **05:00** | `document_exporter -z` → NFS ZIP (+ `.meta` Image-Pin); parallel CNPG `ScheduledBackup` alle 6h (kein Full-DR) |

```mermaid
flowchart LR
  subgraph cluster [Cluster]
    AuthPg[authentik-postgresql]
    AuthMedia[PVC authentik-media]
    BsData[bytestash snippets PVC]
  end
  CronA[CronJob authentik-backup]
  CronB[CronJob bytestash-backup]
  NFS[NFS infra01 backups]
  AuthPg --> CronA
  AuthMedia --> CronA
  BsData --> CronB
  CronA --> NFS
  CronB --> NFS
  NFS --> Restore[PostSync restore Jobs]
```

Diagramme: [`docs/diagrams/archify/app-nfs-backup.html`](../diagrams/archify/app-nfs-backup.html), [`app-bootstrap-restore.html`](../diagrams/archify/app-bootstrap-restore.html).

Details in den App-READMEs / Root-README / BookStack `minilab/05-backup-restore`.

## Konsequenzen

- NAS-Ordner müssen existieren; NFSv3-Kompatibilität beachten.
- Restore ist bewusst manuell getoggelt (kein stilles Überschreiben).
- Authentik: Branding-Media-Sync (NFS → `/media/public/branding`) bleibt separat; Backup deckt zusätzlich Uploads/Icons auf der Media-PVC ab. Secrets nicht im Archive. Dual-Ziel NFS+S3; Wartungsfenster mit HPA-Pause falls HPA aktiv ([upstream HPA](https://docs.goauthentik.io/sys-mgmt/ops/autoscaling/hpa/)). MFA: Full-Restore + `scripts/restore-user-mfa.sh`; `AUTHENTIK_SECRET_KEY` muss zum Backup passen.
- Ergänzt, ersetzt aber nicht Longhorn-Backup-Target ([ADR-0009](0009-longhorn-nfs-backups.md)).
