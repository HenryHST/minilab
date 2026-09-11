# Architecture Decision Records (ADRs)

Kurzprotokolle der Architekturentscheidungen für **minilab** (GitOps auf dem nXk3-Cluster).

Format angelehnt an [Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) / [MADR](https://adr.github.io/madr/). Sprache: Deutsch, wie die übrigen Homelab-Docs.

## Index

| ADR | Titel | Status |
|-----|--------|--------|
| [0001](0001-record-architecture-decisions.md) | Architekturentscheidungen als ADRs festhalten | Accepted |
| [0002](0002-gitops-argocd-app-of-apps.md) | GitOps mit Argo CD App-of-Apps | Accepted |
| [0003](0003-plain-directory-kein-kustomize.md) | Plain Directory statt Kustomize (kein CMP) | Accepted |
| [0004](0004-applicationset-infra.md) | ApplicationSet für Infrastruktur-Apps | Accepted |
| [0005](0005-target-revision-main.md) | `targetRevision: main` statt `HEAD` | Accepted |
| [0006](0006-appproject-infrastruktur.md) | AppProject `infrastruktur` für Plattform-Apps | Accepted |
| [0007](0007-sync-waves.md) | Sync Waves für Bootstrap-Reihenfolge | Accepted |
| [0008](0008-cert-manager-hetzner-dns01.md) | TLS via cert-manager und Hetzner DNS-01 | Accepted |
| [0009](0009-longhorn-nfs-backups.md) | Longhorn als Default-Storage und NFS-Backups | Accepted |
| [0010](0010-authentik-idp.md) | Authentik als zentrales IdP | Accepted |
| [0011](0011-pangolin-public-exposure.md) | Selektive Public Exposure über Pangolin | Accepted |
| [0012](0012-uptime-kuma-sqlite-local-pv.md) | Uptime Kuma: SQLite und Local PV | Accepted |
| [0013](0013-baseline-alerting.md) | Baseline Alerting (Prometheus + Loki) | Accepted |
| [0014](0014-helm-strategie.md) | Helm: Native Argo-Helm vs. committed `helm-manifest.yaml` | Accepted |
| [0015](0015-backup-restore-cronjobs.md) | App-Backups per CronJob auf NFS | Accepted |

## Neues ADR anlegen

1. Nächste freie Nummer `NNNN` wählen.
2. Datei `docs/adr/NNNN-kurz-titel.md` nach Vorlage unten anlegen.
3. Eintrag in dieser Index-Tabelle ergänzen.
4. Bei Bedarf Kurzverweis im Root-[README](../../README.md).

### Vorlage

```markdown
# ADR-NNNN: Titel

- **Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
- **Datum:** YYYY-MM-DD
- **Kontext:** (optional Pfade / Apps)

## Kontext

Was ist das Problem? Welche Kräfte wirken?

## Entscheidung

Was wurde beschlossen?

## Konsequenzen

Positive und negative Folgen, Follow-ups.
```
