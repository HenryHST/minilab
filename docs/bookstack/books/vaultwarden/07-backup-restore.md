---
title: Backup und Restore
book_version: "1.1.3"
---

# Backup & Restore

## Backup (CronJob)

| | |
|--|--|
| Job | `vaultwarden-backup-cron` |
| Schedule | `0 2,14 * * *` (02:00 und 14:00 UTC ≈ 04:00 / 16:00 CEST) |
| Inhalt | `tar czf` von Pod `/data` |
| Ziel | NFS `192.168.0.25:/var/nfs/shared/infra01/vaultwarden-backups` |
| PVC | `vaultwarden-backups` (PV `vaultwarden-backups-nfs`, NFSv3 + nolock) |
| Retention | letzte **14** Archive (`vaultwarden-YYYYMMDD-HHMMSS.tar.gz`) |
| Gatus | Wartung 02:00 und 14:00 UTC je 30 min (Endpoint `vaultwarden`) |

### Manuell via Argo CD

1. Application **vaultwarden** öffnen.
2. Ressource `CronJob/vaultwarden-backup-cron` → **Actions** → **Create Job**.
3. Logs am erzeugten Job (Name typisch `vaultwarden-backup-cron-YYMMDDHHMM`).

CLI:

```bash
argocd app actions run vaultwarden create-job \
  --kind CronJob --resource-name vaultwarden-backup-cron \
  --namespace vaultwarden
```

### kubectl-Fallback

```bash
kubectl -n vaultwarden create job --from=cronjob/vaultwarden-backup-cron vw-backup-manual
kubectl -n vaultwarden logs -f job/vw-backup-manual
```

Übersicht Slot: Minilab-Buch *Backup & Restore*.

## Restore-UI (empfohlen)

| | |
|--|--|
| URL | https://vw-restore.stadthagen.dev (LAN, kein Pangolin) |
| Auth | Authentik ForwardAuth, Gruppe `vaultwarden_admins` |
| Image | `ghcr.io/henryhst/vw-restore:1.0.1` (GHCR; SemVer aus `restore-ui/VERSION`) |
| Quelle | `apps/dev/vaultwarden/restore-ui/` (Dockerfile + OCI Labels) |
| Build | GHA → Tags `X.Y.Z`, `X.Y`, `X`, `latest`, `sha-*`; optional Git-Tag `vw-restore-v*` |
| Default | Archiv **latest** (neuestes nach mtime) |
| Aktion | erzeugt Job `vaultwarden-ui-restore-*` (gleiche Orchestrierung wie PostSync) |

Ablauf: Archiv wählen (oder latest) → optional **force** → `RESTORE` tippen → Restore. Parallel laufende Restores sind gesperrt. Git-ConfigMap bleibt `enabled=false`.

Release: `VERSION` + Deployment-Image-Tag bumpen → Push (oder `git tag vw-restore-vX.Y.Z`). Package ggf. **Public**.

## Restore (PostSync-Bootstrap)

Manifest: `restore-bootstrap.yaml`. Standard: **aus** (`enabled!=true` → Job skippt). ConfigMap-Default: `archive: latest`.

Ablauf (kurz):

1. ConfigMap/Gate setzen: Restore aktivieren, optional Archiv-Name / Force.
2. Argo sync / Job: Deployment auf 0 skalieren (RWO-PVC frei).
3. Worker-Pod mountet Data- + Backup-PVC, entpackt Archiv nach `/data`.
4. Deployment wieder hochfahren.
5. Gate sofort wieder `enabled=false` in Git setzen.

Nach Restore: SSO-Login auf `vw-ext` testen; Clients ggf. neu synchronisieren.

Orchestrierung liegt in ConfigMap-Key `orchestrate.sh` (geteilt mit der Restore-UI).
