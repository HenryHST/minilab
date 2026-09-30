# Mosquitto

Eclipse Mosquitto MQTT broker with Authentik LDAP auth (mosquitto-go-auth). LAN LoadBalancer `192.168.0.218`.

| | |
|--|--|
| Argo | ApplicationSet `infra`, sync wave `1`, namespace `mosquitto` |
| Image | `iegomez/mosquitto-go-auth:3.0.0-mosquitto_2.0.18` |
| Host | `mqtt-pro.stadthagen.dev` → LB `192.168.0.218` (manual Hetzner A) |
| Ports | `1883` MQTT, `8883` MQTTS, `9001` WebSockets (TLS) |
| Auth | LDAP → `ak-outpost-ldap-stadthagen-outpost:389`; groups `mqtt_users` / `mqtt_admins` |
| Data | Longhorn PVC `mosquitto-data` 1 Gi RWO (`replicas: 1`, Strategy `Recreate`) |

## Secrets (before sync)

Infra_LAB SecretSpec → `--tags secrets`:

- `MOSQUITTO_LDAP_BIND_PASSWORD` (= Authentik `ldapservice` password) → Secret `mosquitto-ldap`
- `MOSQUITTO_GRAFANA_PASSWORD` → Secret `grafana-mqtt` (monitoring) for Grafana DS user `mqtt-grafana`

## DNS

Manual Hetzner A: `mqtt-pro` → `192.168.0.218` (not Traefik `.215`).

## Verify

```bash
kubectl -n mosquitto get pods,svc,pvc,certificate
kubectl -n mosquitto get svc mqtt -o jsonpath='{.status.loadBalancer.ingress[0].ip}{"\n"}'
# Expect 192.168.0.218
mosquitto_sub -h mqtt-pro.stadthagen.dev -p 8883 -u henry -P '…' -t 'test/#' -v --cafile /etc/ssl/cert.pem
```

ADR: [`docs/adr/0029-mosquitto.md`](../../../docs/adr/0029-mosquitto.md).
