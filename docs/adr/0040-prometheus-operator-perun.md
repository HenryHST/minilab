# ADR-0040: Prometheus Operator — Perun-Gates (Lab)

- **Status:** Accepted
- **Datum:** 2026-11-06
- **Kontext:** [Prometheus Operator in production: five failure patterns](https://perun.au/insights/prometheus-operator-production); SoT `apps/monitoring/kube-prometheus-stack/`

## Kontext

nXk3 betreibt **eine** Prometheus-Instanz (kube-prometheus-stack Chart, Operator v0.94.1), `replicas: 1`, Retention 9d/2GB, PVC 5Gi Longhorn, leere SM/PM-Selektoren (alle Monitore), App-Convention `release: kube-prometheus-stack`. Alertmanager hat bereits eine Lab-Lektion zu Inhibition (`equal: [namespace, alertname]`).

## Entscheidung

1. **Kein** Multi-Prometheus-Split, kein Thanos, keine ungezielte Replica-Erhöhung (vermeidet Perun #02/#03 im Lab-Maßstab).
2. **Scrape:** global `scrapeInterval: 30s`, explizit `scrapeTimeout: 10s`; Alert `PrometheusScrapeNearTimeout` wenn Dauer >8s.
3. **ServiceMonitor/PodMonitor:** Convention Label `release: kube-prometheus-stack` beibehalten; Selektoren vorerst leer (alles scrapen). Label-Breaking Changes an Services/Pods = Review gegen Monitore (Perun #01).
4. **Inhibition:** critical→warning nur mit `equal: [namespace, alertname]` (+ bestehende `PVENodeDown`-Regel); keine Verbreiterung von Matchern ohne `amtool`/Review (Perun #04 — bereits gefixt).
5. **PVC:** bei Scale-down/Delete Prometheus CR orphaned PVCs manuell prüfen (`prometheus-*` in `monitoring`); Operator räumt sie nicht auf (Perun #03).
6. Docs: Infra_LAB BookStack K3s [24-prometheus-operator-stance](https://github.com/HenryHST/Infra_LAB/blob/main/docs/bookstack/books/k3s/24-prometheus-operator-stance.md).

## Konsequenzen

- Weniger Overlap-Scrape-Risiko; frühes Signal bei langsamen Targets.
- Keine zusätzliche Operator-Komplexität; Day-2-Wissen zu Inhibit/PVC/Monitor-Labels in BookStack.
