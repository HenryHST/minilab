# Deploy & Verify

## Voraussetzungen

1. SecretSpec `MOSQUITTO_LDAP_BIND_PASSWORD` (= Terraform `ldapservice_password`) und `MOSQUITTO_GRAFANA_PASSWORD` (= `mqtt_grafana_password`) → `--tags secrets` (Secrets `mosquitto-ldap`, `grafana-mqtt`).
2. Terraform: Gruppen `mqtt_admins` / `mqtt_users`, User `mqtt-grafana`, LDAP-App-PolicyBindings; Henry in `mqtt_admins`, Marion in `mqtt_users`.
3. LDAP-Outpost erreichbar: `ak-outpost-ldap-stadthagen-outpost.authentik.svc.cluster.local:389`.
4. Manueller Hetzner A `mqtt-pro` → `192.168.0.218`.
5. ApplicationSet/AppProject `infra` listen `mosquitto`.

## Sync

```bash
kubectl -n argocd get application mosquitto
kubectl -n mosquitto get pods,svc,pvc,certificate,networkpolicy
kubectl -n authentik get svc ak-outpost-ldap-stadthagen-outpost
```

## Checks

1. Service EXTERNAL-IP = `192.168.0.218`; Pod Ready.
2. MQTT connect mit User in `mqtt_users` / `mqtt_admins` ok; User ohne Gruppe → Deny.
3. TLS auf 8883 mit SNI `mqtt-pro.stadthagen.dev` (Certificate Ready).
4. Grafana: Datasource **MQTT** Connected; Dashboard **Mosquitto MQTT** sichtbar.
5. DNS A + Certificate Ready.
