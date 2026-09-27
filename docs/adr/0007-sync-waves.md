# ADR-0007: Sync Waves für Bootstrap-Reihenfolge

- **Status:** Accepted
- **Datum:** 2026-09-11

## Kontext

App-of-Apps und ApplicationSet erzeugen Abhängigkeiten: AppProject muss vor Infra-Apps existieren; Storage/Monitoring vor abhängigen Workloads; User-Apps später.

## Entscheidung

Sync Waves (Auszug, siehe Root-README):

| Wave | Inhalt |
|------|--------|
| -2 | AppProjects `infra` / `monitoring` / `ops` / `dev` |
| 0 | Application `gitops-bootstrap` → ApplicationSets; frühe Ops (cert-manager, metrics-server, registry, newt, …) |
| 1 | Longhorn, k8tz, system-upgrade-controller, kube-prometheus-stack |
| 2 | unifipoller, authentik, termix, headlamp, hubble-ui |
| 3 | Tooling-Apps, Loki/Alloy, vaultwarden, pangolin-publish, … |

Details und Buckets: [ADR-0022](0022-apps-bucket-applicationsets.md).

Neue Apps wählen die passende Wave nach Abhängigkeit, nicht nach „Wichtigkeit“.

## Konsequenzen

- Geordnetes Bootstrap bei Cluster-Neuaufsetzen.
- Falsche Wave kann Transient-Errors erzeugen (Issuer fehlt, PVC pending, IdP noch nicht da).
