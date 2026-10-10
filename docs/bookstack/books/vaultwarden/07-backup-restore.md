---
title: Backup und Restore
book_version: "1.0.0"
---

# Backup & Restore

## Backup (CronJob)

| | |
|--|--|
| Job | `vaultwarden-backup-cron` |
| Schedule | `0 2 * * *` (02:00 UTC ≈ 04:00 CEST) |
| Inhalt | `tar czf` von Pod `/data` |
| Ziel | NFS `192.168.0.25:/var/nfs/shared/infra01/vaultwarden-backups` |
| PVC | `vaultwarden-backups` (PV `vaultwarden-backups-nfs`, NFSv3 + nolock) |
| Retention | letzte 7 Archive (`vaultwarden-YYYYMMDD-HHMMSS.tar.gz`) |

Manuell anstoßen:

```bash
kubectl -n vaultwarden create job --from=cronjob/vaultwarden-backup-cron vw-backup-manual
kubectl -n vaultwarden logs -f job/vw-backup-manual
```

Übersicht Slot: Minilab-Buch *Backup & Restore*.

## Restore (PostSync-Bootstrap)

Manifest: `restore-bootstrap.yaml`. Standard: **aus** (`enabled!=true` → Job skippt).

Ablauf (kurz):

1. ConfigMap/Gate setzen: Restore aktivieren, optional Archiv-Name / Force.
2. Argo sync / Job: Deployment auf 0 skalieren (RWO-PVC frei).
3. Worker-Pod mountet Data- + Backup-PVC, entpackt Archiv nach `/data`.
4. Deployment wieder hochfahren.
5. Gate sofort wieder `enabled=false` in Git setzen.

Nach Restore: SSO-Login auf `vw-ext` testen; Clients ggf. neu synchronisieren.

Details und Flags stehen im Manifest-Kommentar / ConfigMap-Keys im gleichen File.
