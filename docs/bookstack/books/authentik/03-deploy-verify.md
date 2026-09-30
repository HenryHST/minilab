---
title: Deploy und Verify
book_version: "1.0.0"
---

# Deploy und Verify

## Voraussetzungen

1. ApplicationSet `ops` enthält `authentik` (Wave 2, Pfad `apps/ops/authentik`).
2. SecretSpecs `AUTHENTIK_BOOTSTRAP_EMAIL` und `AUTHENTIK_BOOTSTRAP_PASSWORD` sind gesetzt. Ansible `--tags secrets` legt Secret `authentik-credentials` an.
3. Pangolin veröffentlicht `idp.stadthagen.dev`.
4. NFS-Export für Brand-Medien und für `authentik-backups` ist erreichbar.

## Sync

```bash
kubectl -n argocd get application authentik
kubectl -n authentik get deploy,pods,ingressroute,cronjob,pvc
```

## Checks

1. Deployments von Server und Worker sind Ready.
2. `https://idp.stadthagen.dev` zeigt die Login-Seite mit Titel **Willkommen Stadthagen Home**.
3. Job aus `authentik-media-sync` hat die Dateien unter `/media/public/branding/` gelegt. Logo, Favicon und `website-work.svg` sind dabei.
4. CronJob `authentik-backup-cron` existiert, Zeitplan 05:00 UTC.
5. Ein OIDC-Login, zum Beispiel Termix über den Reiter External, kommt zurück auf die App.
6. `https://registry-ui.stadthagen.dev` fordert Authentik an, sobald Outpost `ak-outpost-registry-ui` Ready ist.

Keine Secret-Werte auslesen. Die Checks lesen Namen und Bereitschaft, nicht den Inhalt von `authentik-credentials`.
