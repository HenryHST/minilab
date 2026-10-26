---
title: Deploy und Verify
book_version: "1.3.4"
updated: "2026-10-26"
---

# Deploy und Verify

## Voraussetzungen

1. ApplicationSet `ops` enthält `authentik` (Wave 2, Pfad `apps/ops/authentik`).
2. SecretSpecs `AUTHENTIK_BOOTSTRAP_EMAIL` und `AUTHENTIK_BOOTSTRAP_PASSWORD` sind gesetzt. Ansible `--tags secrets` legt Secret `authentik-credentials` an.
3. Pangolin veröffentlicht `idp.stadthagen.dev` über `pangolin-publish` (Kapitel **Externe Ressourcen mit Pangolin**).
4. NFS-Export für Brand-Medien und für `authentik-backups` ist erreichbar.

## Sync

```bash
kubectl -n argocd get application authentik
kubectl -n authentik get deploy,pods,ingressroute,cronjob,pvc
```

## Checks

1. Deployments von Server und Worker sind Ready.
2. `https://idp.stadthagen.dev` zeigt die Login-Seite mit Titel **Willkommen Stadthagen Home**.
3. Valkey (Redis-Protokoll): Secret `AUTHENTIK_REDIS__HOST` zeigt auf `authentik-redis.authentik.svc.cluster.local`; STS `authentik-redis` Image `valkey/valkey:9.1.2-alpine`; beide Pods Ready. Smoke:

```bash
kubectl -n authentik get sts,pods -l app.kubernetes.io/component=redis
kubectl -n authentik exec authentik-redis-0 -- valkey-cli ping   # PONG
kubectl -n authentik exec authentik-redis-0 -- valkey-cli info replication | rg 'role|connected_slaves'
kubectl -n authentik exec authentik-redis-1 -- valkey-cli info replication | rg 'role|master_host'
```

Erwartung: `-0` = `role:master`, `connected_slaves:1`; `-1` = `role:slave`. Optional: Pod `-1` löschen und Rejoin prüfen. Ohne Broker wird die Login-Seite spürbar langsam.
4. Job aus `authentik-media-sync` hat die Dateien unter `/media/public/branding/` gelegt. Logo, Favicon und `website-work.svg` sind dabei.
5. CronJobs `authentik-backup-0230` und `authentik-backup-1150` existieren (Europe/Berlin). Media kommt vom PVC-Mount (Scale-to-0); Archive parallel NFS + S3. Siehe `apps/ops/authentik/VERIFY.md`.
6. Ein OIDC-Login, zum Beispiel Termix über den Reiter External, kommt zurück auf die App.
7. `https://registry-ui.stadthagen.dev` fordert Authentik an, sobald Outpost `ak-outpost-registry-ui` Ready ist.
8. Application `pangolin-publish` ist Synced. Newt-Site `k3s` ist healthy.

Keine Secret-Werte auslesen. Die Checks lesen Namen und Bereitschaft, nicht den Inhalt von `authentik-credentials`.

## Fehlersuche (GitOps / Backup)

Argo ComparisonError `authentik-server.[noNs]` oder Backup-Log `cannot exec into a completed pod` / `phase is Succeeded`: Fehleranalyse und Fix im Infra_LAB-Buch **Authentik Runtime** → Kapitel Troubleshooting (Incidents 2026-10-13).
