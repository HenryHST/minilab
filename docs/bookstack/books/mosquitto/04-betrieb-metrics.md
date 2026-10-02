---
title: Betrieb & Metrics
book_version: "1.2.0"
---

# Betrieb & Metrics

## Exporter

`sapcc/mosquitto-exporter` subscribed `$SYS/#` (User `mqtt-exporter` ∈ `mqtt_admins`) und exposiert `:9234/metrics`.

Wichtige Prometheus-Namen (Topic → Gauge/Counter):

| $SYS Topic | Metric |
|------------|--------|
| `$SYS/broker/clients/connected` | `broker_clients_connected` |
| `$SYS/broker/clients/total` | `broker_clients_total` |
| `$SYS/broker/clients/maximum` | `broker_clients_maximum` |
| `$SYS/broker/messages/*` | `broker_messages_*` |
| `$SYS/broker/load/messages/*/1min` | `broker_load_messages_*_1min` |

```bash
kubectl -n mosquitto port-forward svc/mosquitto-exporter 9234:9234
curl -s localhost:9234/metrics | grep broker_clients
```

## Grafana

| Dashboard | Quelle |
|-----------|--------|
| Mosquitto MQTT | MQTT Datasource (`uid: mqtt`) — Topics |
| Mosquitto Broker ($SYS) | Prometheus (`uid: prometheus`) — Clients / Messages / Load |

## Probe / Tools

```bash
kubectl -n mosquitto exec -it deploy/mqtt-tools -- \
  sh -c 'mosquitto_pub -h mqtt -p 1883 -u "$MQTT_USER" -P "$MQTT_PASS" -t test/lab -m ok'

kubectl -n mosquitto exec -it deploy/mqtt-tools -- \
  sh -c 'mosquitto_sub -h mqtt -p 1883 -u "$MQTT_USER" -P "$MQTT_PASS" -t "test/#" -v'
```

Env `MQTT_USER` / `MQTT_PASS` stammen aus Secret `mosquitto-probe`. CronJob `mqtt-smoke` nutzt dasselbe Secret.
