# ADR-0006: AppProject `infrastruktur` für Plattform-Apps

- **Status:** Accepted
- **Datum:** 2026-09-11
- **Kontext:** [`apps/argocd-apps/raw/appproject-infrastruktur.yaml`](../../apps/argocd-apps/raw/appproject-infrastruktur.yaml)

## Kontext

Infra-Apps brauchen breite Rechte (Cluster-Ressourcen, Multi-Source Helm + Git, diverse Namespaces inkl. `kube-system`). Das Default-AppProject ist dafür zu eng bzw. unpassend getrennt von User-Apps. Fehlendes Project führte zu `app is not allowed in project "infrastruktur"` / `AppProject not found`.

## Entscheidung

- Eigenes AppProject **`infrastruktur`** (Anzeige: Infrastruktur).
- Destinations: `server: "*"` und `namespace: "*"` (vermeidet Server-URL-Mismatch `…svc` vs `…svc:443`).
- Whitelist Cluster- und Namespace-Ressourcen: `*/*`.
- Bereitstellung über Application `infra-applicationset` aus `raw/` mit Sync-Wave **-2** auf dem AppProject.
- ApplicationSet-Apps (`infra/*`, inkl. `pangolin-publish`) und `authentik` nutzen dieses Project; übrige User-Apps bleiben bei `default`.

## Konsequenzen

- Bootstrap-Reihenfolge: Project vor ApplicationSet vor Workloads ([ADR-0007](0007-sync-waves.md)).
- Alte Application `infrastruktur-project` / Pfad `bootstrap/` entfallen.
- Project ist bewusst weit gefasst (Homelab-Vertrauensgrenze = dieses Repo + Cluster-Admins).
