---
title: Übersicht
book_version: "1.2.0"
---

# Übersicht

Eclipse Mosquitto stellt MQTT auf nXk3 bereit. Auth läuft über Authentik LDAP-Outpost (kein OIDC — MQTT unterstützt das nicht). Exposure ist LAN-LoadBalancer `192.168.0.218`.

![Mosquitto Architektur](https://raw.githubusercontent.com/HenryHST/minilab/main/docs/diagrams/archify/exports/mosquitto-architektur.png)

Explorer: [mosquitto-architektur.html](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/mosquitto-architektur.html)

```mermaid
flowchart LR
  Clients[LAN_Clients] -->|"1883 / 8883 / 9001"| LB["LB_192.168.0.218"]
  LB --> Svc[Service_mqtt]
  Svc --> Mosq[mosquitto]
  Mosq -->|"LDAP"| LDAP["ak-outpost-ldap"]
  LDAP --> IdP[Authentik]
  Exporter[mosquitto_exporter] -->|"$SYS/#"| Svc
  Exporter --> Prom[Prometheus]
  Prom --> Grafana
  Grafana -->|MQTT_DS| Svc
  Probe[mqtt_smoke] -->|pub| Svc
```

| | |
|--|--|
| Argo App | `mosquitto` (ApplicationSet `infra`, Wave 1) |
| Namespace | `mosquitto` |
| LAN | `mqtt-pro.stadthagen.dev` → `192.168.0.218` |
| Ports | 1883 MQTT · 8883 MQTTS · 9001 WebSockets (TLS) |
| Auth | LDAP-Gruppen `mqtt_users` / `mqtt_admins` |
| Metrics | Exporter `:9234` · `ServiceMonitor` · Grafana **Mosquitto Broker ($SYS)** |

ADR: [0029-mosquitto](../../../adr/0029-mosquitto.md).
