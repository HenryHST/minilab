# ADR-0007: Sync Waves für Bootstrap-Reihenfolge

- **Status:** Accepted
- **Datum:** 2026-09-11

## Kontext

App-of-Apps und ApplicationSet erzeugen Abhängigkeiten: AppProject muss vor Infra-Apps existieren; Storage/Monitoring vor abhängigen Workloads; User-Apps später.

## Entscheidung

Sync Waves (Auszug, siehe Root-README):

| Wave | Inhalt |
|------|--------|
| -2 | AppProject `infrastruktur` |
| 0 | Application `infra-applicationset` → ApplicationSet `infra`; frühe Infra (cert-manager, metrics-server, registry, newt, …) |
| 1 | Longhorn, system-upgrade-controller, kube-prometheus-stack |
| 2 | unifipoller, authentik, termix, headlamp |
| 3 | Tooling-Apps, Loki/Alloy, vaultwarden, pangolin-publish, … |

Neue Apps wählen die passende Wave nach Abhängigkeit, nicht nach „Wichtigkeit“.

## Konsequenzen

- Geordnetes Bootstrap bei Cluster-Neuaufsetzen.
- Falsche Wave kann Transient-Errors erzeugen (Issuer fehlt, PVC pending, IdP noch nicht da).
