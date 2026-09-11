# ADR-0003: Plain Directory statt Kustomize (kein CMP)

- **Status:** Accepted
- **Datum:** 2026-09-11
- **Kontext:** Argo CD repo-server / Config Management Plugin

## Kontext

Der Argo-CD-repo-server leitete **Kustomize**-Builds an einen CMP-Sidecar auf Port `:8081` weiter. Dieser war im Cluster nicht erreichbar (`dial tcp …:8081: connect: no route to host`). Kustomize-basierte Apps (inkl. `helmCharts` in `kustomization.yaml`) waren damit blockiert.

## Entscheidung

- **Kein** `kustomization.yaml` in App-/Infra-Pfaden, die Argo als Directory synct.
- Manifeste als **Plain YAML** im Verzeichnis.
- Helm für User-Apps: gerendertes `helm-manifest.yaml` committen (`helm template …`), siehe [ADR-0014](0014-helm-strategie.md).
- Helm für Infra-Apps: native Argo-CD-Helm-Quelle über ApplicationSet, Extras als Plain Directory in `manifests/`.

## Konsequenzen

- Weniger Build-Magie im Cluster; Diffs sind „das, was deployed wird“.
- Chart-Upgrades bei User-Helm-Apps erfordern Regenerieren und Commit des Manifests.
- Kein CMP-Sidecar nötig für den normalen Sync-Pfad.
