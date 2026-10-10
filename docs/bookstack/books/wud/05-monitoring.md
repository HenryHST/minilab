---
title: Monitoring
book_version: "1.0.0"
---

# Monitoring

Grundlage ist die [WUD-Monitoring-Doku](https://getwud.app/docs/monitoring/).

## Health

`GET /health` liefert `200` mit `{"uptime": …}`. Der Endpoint braucht keinen Login.

- Kubernetes: Readiness und Liveness auf `/health` (Port 3000)
- Gatus: Endpoint `wud` (Gruppe `plattform`) auf `https://wupd.stadthagen.dev/health`, meldet per Pushover

## Prometheus

| Variable | Wert |
|--|--|
| `WUD_PROMETHEUS_ENABLED` | `true` |
| `WUD_PROMETHEUS_AUTH` | `false` |

`/metrics` ist ohne Login erreichbar. Damit das nicht öffentlich wird:

- Die IngressRoute schließt `/metrics` aus (`!PathPrefix(`/metrics`)`, liefert 404)
- Die NetworkPolicy erlaubt Port 3000 nur aus `traefik` und `monitoring`

ServiceMonitor `wud/wud` scrapt alle 60 s.

Wichtige Metriken:

| Metrik | Bedeutung |
|--|--|
| `wud_containers{update_available="true"}` | Container mit verfügbarem Update |
| `wud_watcher_total{type="kubernetes"}` | Anzahl beobachteter Container |
| `wud_registry_response` | Antwortzeit je Registry |
| `wud_trigger_count{status="error"}` | fehlgeschlagene Trigger |

Tabelle aller Updates in Grafana/Explore:

```promql
sum by (name, image_name, image_tag_value, result_tag) (wud_containers{update_available="true"})
```

## Grafana

ConfigMap `grafana-dashboard-wud` (`apps/monitoring/kube-prometheus-stack/manifests/dashboard-wud.yaml`) enthält das offizielle Dashboard `grafana/overview.json` aus WUD 9.3.0. Die Datasource ist auf `prometheus` umgestellt, die UID lautet `wud-overview`.

## Alerts

PrometheusRule `wud-alerts`:

| Alert | Bedingung |
|--|--|
| `WudScrapeDown` | `/metrics` 10 min nicht erreichbar |
| `WudTriggerFailing` | ein Trigger ist in der letzten Stunde fehlgeschlagen |
| `WudWatcherEmpty` | Kubernetes-Watcher sieht 2 h lang keine Container |

Für „Update verfügbar“ gibt es bewusst keinen Alert. Das meldet WUD schon per Pushover, eine Regel würde es über den E-Mail-Default-Receiver doppeln.
