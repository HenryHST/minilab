---
title: Quellen
book_version: "1.3.0"
---

# Quellen

- App-README: [`apps/infra/mosquitto/README.md`](../../../../apps/infra/mosquitto/README.md)
- ADR-0029: [`docs/adr/0029-mosquitto.md`](../../../adr/0029-mosquitto.md)
- Archify: [`docs/diagrams/archify/mosquitto-architektur.html`](../../../diagrams/archify/mosquitto-architektur.html)
- SeeCode Fehlersuche: [`docs/diagrams/seecode/mosquitto-ldap-fehlersuche.html`](../../../diagrams/seecode/mosquitto-ldap-fehlersuche.html)
- Image: [HenryHST/mosquitto-custom](https://github.com/HenryHST/mosquitto-custom) → Lab `registry.stadthagen.dev/infra/mosquitto-custom:1.1.2` (GHCR `ghcr.io/henryhst/mosquitto-custom`)
- Exporter: [sapcc/mosquitto-exporter](https://github.com/sapcc/mosquitto-exporter)
- Grafana plugin: [grafana-mqtt-datasource](https://grafana.com/grafana/plugins/grafana-mqtt-datasource/)
- LDAP Outpost: Authentik module `modules/ldap/` (Infra_LAB)
- Secrets-Rolle: Infra_LAB `roles/k3s_secrets` (`mosquitto-ldap`, `format_encode: none`, `| trim`)
