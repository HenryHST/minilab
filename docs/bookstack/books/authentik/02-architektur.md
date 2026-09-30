---
title: Architektur
book_version: "1.1.0"
---

# Architektur

## Laufzeit

- GitOps-App `apps/ops/authentik`. Chart `2026.8.3` von `https://charts.goauthentik.io`, gerendert nach `helm-manifest.yaml`.
- ApplicationSet `ops`, Wave 2, Namespace `authentik`.
- Ingress `idp.stadthagen.dev` im Cluster. Von außen erreicht Pangolin denselben Host über Newt und `pangolin-publish` (Kapitel **Externe Ressourcen mit Pangolin**, [ADR-0011](../../../adr/0011-pangolin-public-exposure.md)).
- Server und Worker laufen im Namespace. Die Datenbank ist die vom Chart mitgebrachte Postgres-Instanz. Backup und Restore liegen daneben, nicht im Chart.

## Steuerung

Applications, Provider, Gruppen, Flows und die Brand liegen in OpenTofu (Kapitel **OpenTofu**). Client-Secrets kommen aus SecretSpecs und stehen nicht im Git.

Eine App behält einen lokalen Admin-Login, wo das schon so entschieden ist. Grafana lässt `oauth_auto_login` aus. Fällt das IdP aus, bleibt dieser Weg nutzbar.

## Zwei Wege in die App

| | Native OIDC | ForwardAuth |
|--|--|--|
| Wer prüft das Login | die App selbst | Traefik, bevor die App den Request sieht |
| Authentik-Objekt | OAuth2/OIDC-Provider | Proxy-Provider und Outpost |
| Beispiel | Termix, Slug `termix` | registry-ui, Service `ak-outpost-registry-ui` |
| Claim bzw. Header | `groups` im Token | `X-authentik-username`, `X-authentik-groups`, `X-authentik-email` |

Gruppen steuern den Zugang. Termix bindet `Termix Admins` und `Termix Users` an die Application. Die App liest die Admin-Gruppe als `OIDC_ADMIN_GROUP`.

## Medien und Backup

Logos und der Flow-Hintergrund liegen auf NFS `192.168.0.25:/var/nfs/shared/infra01/media/public/branding/` und werden nach PVC `authentik-media` kopiert. Das ist nicht das Backup. Der CronJob `authentik-backup-cron` (05:00 UTC) sichert `pg_dump` und `/media` nach `authentik-backups`.
