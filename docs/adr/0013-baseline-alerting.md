# ADR-0013: Baseline Alerting (Prometheus + Loki)

- **Status:** Accepted
- **Datum:** 2026-09-11
- **Kontext:** `apps/monitoring/kube-prometheus-stack/`, `apps/monitoring/loki/`

## Kontext

Homelab braucht frühzeitige Signale zu Workload-, Plattform-, Proxmox- und CNI-Problemen, ohne komplexes On-Call-Setup. Grafana soll visualisieren, nicht primär Alert-Engine sein.

## Entscheidung

- **V1 + V2:** PrometheusRules **und** Loki Ruler → Alertmanager.
- Notification: **E-Mail** an `info@henrystadthagen.de`; `critical` und `warning` getrennte Routes/Subjects.
- Chart-`defaultRules` behalten; Custom Rules in `manifests/homelab-alerts.yaml`.
- Proxmox (pve-exporter) und Cilium/Hubble sind Teil der Baseline.
- Grafana: Datasource Alertmanager, `handleGrafanaManagedAlerts: false`.

Ausführliches Design, Matrix und Runbook: [`apps/monitoring/kube-prometheus-stack/ALERTING.md`](../../apps/monitoring/kube-prometheus-stack/ALERTING.md). Tests: `apps/monitoring/kube-prometheus-stack/tests/`.

## Konsequenzen

- Neue kritische Signale als PrometheusRule oder Loki-Rule ergänzen, nicht als Grafana-managed Alert.
- SMTP und Scrape-Targets (Proxmox, …) sind Betriebsvoraussetzung.
- Alert-Noise steuern über Thresholds/Inhibit, nicht durch Abschalten ganzer Stacks.
