---
title: Deploy & Verify
book_version: "1.1.0"
---

# Deploy & Verify

## Voraussetzungen

1. SecretSpec → `--tags secrets`:
   - `MOSQUITTO_LDAP_BIND_PASSWORD` (= TF `ldapservice_password`) → `mosquitto-ldap`
   - `MOSQUITTO_GRAFANA_PASSWORD` → `grafana-mqtt`
   - `MOSQUITTO_EXPORTER_PASSWORD` → `mosquitto-exporter`
   - `MOSQUITTO_PROBE_PASSWORD` → `mosquitto-probe`
2. Terraform: Gruppen `mqtt_admins` / `mqtt_users`, Users `mqtt-grafana` / `mqtt-exporter` / `mqtt-probe`, LDAP-App-PolicyBindings; Henry in `mqtt_admins`, Marion in `mqtt_users`.
3. LDAP-Outpost erreichbar: `ak-outpost-ldap-stadthagen-outpost.authentik.svc.cluster.local:389`.
4. Manueller Hetzner A `mqtt-pro` → `192.168.0.218`.
5. ApplicationSet/AppProject `infra` listen `mosquitto`.

## Sync

```bash
kubectl -n argocd get application mosquitto
kubectl -n mosquitto get pods,svc,pvc,certificate,networkpolicy,cronjob
kubectl -n authentik get svc ak-outpost-ldap-stadthagen-outpost
```

## Checks

1. Service EXTERNAL-IP = `192.168.0.218`; Pod Ready.
2. MQTT connect mit User in `mqtt_users` / `mqtt_admins` ok; User ohne Gruppe → Deny.
3. TLS auf 8883 mit SNI `mqtt-pro.stadthagen.dev` (Certificate Ready).
4. Grafana: Datasource **MQTT** Connected; Dashboards **Mosquitto MQTT** und **Mosquitto Broker ($SYS)** sichtbar.
5. Exporter: Prometheus Target `mosquitto-exporter` UP; Metrics enthalten `broker_clients_*`.
6. CronJob `mqtt-smoke` Completed; `mqtt-tools` exec pub ok.
7. DNS A + Certificate Ready.
