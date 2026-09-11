# ADR-0014: Helm-Strategie — Native Argo-Helm vs. committed Manifest

- **Status:** Accepted
- **Datum:** 2026-09-11

## Kontext

Helm-Charts sollen deploybar sein, ohne Kustomize/`helmCharts` (siehe [ADR-0003](0003-plain-directory-kein-kustomize.md)). Infra- und User-Apps haben unterschiedliche Update- und Diff-Bedürfnisse.

## Entscheidung

| Bereich | Strategie |
|---------|-----------|
| **Infra** (`infra/*` via ApplicationSet) | **Native Argo-CD-Helm**-Quelle (+ optional zweite Git-Quelle `manifests/` für Certificates, Rules, …) |
| **User-Apps** mit Chart (`headlamp`, `termix`, `unifipoller`, …) | Chart lokal mit `helm template` rendern → committed **`helm-manifest.yaml`** (+ Extras als Plain YAML) |

Regenerationsbefehl steht im Dateikopf des jeweiligen `helm-manifest.yaml`.

## Konsequenzen

- Infra-Chart-Upgrades: Version im ApplicationSet / Values bump, Argo rendert.
- User-Helm-Upgrades: Template neu erzeugen, Diff reviewen, committen.
- Kein CMP und kein Kustomize-Helm nötig.
