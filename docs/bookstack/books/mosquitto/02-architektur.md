---
title: Architektur
book_version: "1.2.0"
---

# Architektur

## Broker

- Image `ghcr.io/henryhst/mosquitto-custom:1.1.1` (Mosquitto 2.1.2 Debian/glibc + vendored go-auth LDAP-Plugin; amd64 nodeSelector).
- Conf `/mosquitto/config/mosquitto.conf` (bind password inject im init `tls-bootstrap`).
- `replicas: 1`, Strategy `Recreate`, PVC `mosquitto-data` 1 Gi Longhorn RWO.
- `sys_interval 10` — publiziert `$SYS/#` für den Exporter.
- NetworkPolicy: Ingress nur auf 1883/8883/9001.

## Auth

| Gruppe | Rolle |
|--------|--------|
| `mqtt_users` | normale Clients (pub/sub), Grafana DS, Smoke-Probe |
| `mqtt_admins` | Superuser inkl. `$SYS/#` (Exporter) |

Service-Accounts (Authentik, Terraform): `mqtt-grafana`, `mqtt-exporter`, `mqtt-probe`.

## Observability

Zwei getrennte Grafana-Dashboards:

1. **Mosquitto MQTT** — MQTT-Datasource, Live-Topics.
2. **Mosquitto Broker ($SYS)** — Prometheus-Metriken `broker_*` vom sapcc-Exporter.

## Smoke

- Deployment `mqtt-tools` (`eclipse-mosquitto:2`) für `kubectl exec`.
- CronJob `mqtt-smoke` alle 15 min: Publish auf `test/smoke/<timestamp>`.
