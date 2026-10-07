# Mosquitto

Eclipse Mosquitto MQTT broker with Authentik LDAP auth (go-auth). LAN LoadBalancer `192.168.0.218`.

| | |
|--|--|
| Argo | ApplicationSet `infra`, sync wave `1`, namespace `mosquitto` |
| Image | `ghcr.io/henryhst/mosquitto-custom:1.1.1` (Mosquitto 2.1.2 glibc; [mosquitto-custom](https://github.com/HenryHST/mosquitto-custom); **amd64** `nodeSelector`) |
| Conf | `/mosquitto/config/mosquitto.conf` (bind pw via init `tls-bootstrap`; init `ldap-preflight` waits for the outpost and checks the bind) |
| Host | `mqtt-pro.stadthagen.dev` → LB `192.168.0.218` (manual Hetzner A) |
| Ports | `1883` MQTT, `8883` MQTTS, `9001` WebSockets (TLS) |
| Auth | LDAP → `ak-outpost-ldap-stadthagen-outpost:389`; groups `mqtt_users` / `mqtt_admins` |
| Data | Longhorn PVC `mosquitto-data` 1 Gi RWO (`replicas: 1`, Strategy `Recreate`) |
| TLS | Certificate `mqtt-pro-tls` (LE); until Ready, init `tls-bootstrap` uses a self-signed placeholder so the pod can start |
| Metrics | `sapcc/mosquitto-exporter` → `:9234/metrics` (`ServiceMonitor`); broker `sys_interval 10`; image is **amd64-only** (`nodeSelector: kubernetes.io/arch=amd64`) |
| Smoke | Deployment `mqtt-tools` + CronJob `mqtt-smoke` (every 15 min) |


## Secrets (before sync)

Infra_LAB SecretSpec → `--tags secrets`:

- `MOSQUITTO_LDAP_BIND_PASSWORD` (= Authentik `ldapservice` password) → Secret `mosquitto-ldap`
- `MOSQUITTO_GRAFANA_PASSWORD` → Secret `grafana-mqtt` (monitoring) for Grafana DS user `mqtt-grafana`
- `MOSQUITTO_EXPORTER_PASSWORD` → Secret `mosquitto-exporter` (user `mqtt-exporter` in `mqtt_admins`, `$SYS/#`)
- `MOSQUITTO_PROBE_PASSWORD` → Secret `mosquitto-probe` (user `mqtt-probe` in `mqtt_users`)

## DNS

Manual Hetzner A: `mqtt-pro` → `192.168.0.218` (not Traefik `.215`).

## MQTT tools (in-cluster)

```bash
# Publish
kubectl -n mosquitto exec -it deploy/mqtt-tools -- \
  mosquitto_pub -h mqtt -p 1883 -u "$MQTT_USER" -P "$MQTT_PASS" -t test/lab -m ok

# Subscribe
kubectl -n mosquitto exec -it deploy/mqtt-tools -- \
  mosquitto_sub -h mqtt -p 1883 -u "$MQTT_USER" -P "$MQTT_PASS" -t 'test/#' -v
```

Host aliases: short `mqtt` or FQDN `mqtt.mosquitto.svc.cluster.local`. Env `MQTT_USER` / `MQTT_PASS` come from Secret `mosquitto-probe`.

## Startup

go-auth exits the broker as soon as the LDAP outpost refuses TCP or the `ldapservice` bind is rejected. Init `ldap-preflight` handles both before Mosquitto starts:

- Outpost down: the pod stays in `Init` and logs `not accepting LDAP connections`, including the `kubectl logs` command for `ak-outpost-ldap-stadthagen-outpost`. It retries for 10 minutes (40 × 15s), then fails that init.
- Wrong password or surrounding whitespace: init exits immediately with `invalid credentials` and names Secret `mosquitto-ldap` / SecretSpec `MOSQUITTO_LDAP_BIND_PASSWORD`.

```bash
kubectl -n mosquitto logs deploy/mosquitto -c ldap-preflight
```

## Verify

```bash
kubectl -n mosquitto get pods,svc,pvc,certificate,cronjob
kubectl -n mosquitto get svc mqtt -o jsonpath='{.status.loadBalancer.ingress[0].ip}{"\n"}'
# Expect 192.168.0.218
kubectl -n mosquitto exec deploy/mqtt-tools -- \
  mosquitto_pub -h mqtt -p 1883 -u "$MQTT_USER" -P "$MQTT_PASS" -t test/lab -m ok
kubectl -n mosquitto port-forward svc/mosquitto-exporter 9234:9234
# curl -s localhost:9234/metrics | grep broker_clients
mosquitto_sub -h mqtt-pro.stadthagen.dev -p 8883 -u henry -P '…' -t 'test/#' -v --cafile /etc/ssl/cert.pem
```

Grafana dashboards (monitoring): **Mosquitto MQTT** (topic DS) and **Mosquitto Broker ($SYS)** (Prometheus).

ADR: [`docs/adr/0029-mosquitto.md`](../../../docs/adr/0029-mosquitto.md).
