---
title: Benachrichtigungen
book_version: "1.0.0"
---

# Benachrichtigungen

WUD schickt Meldungen selbst, über zwei Trigger. Update-Trigger (Docker, Compose, Kubernetes-Patch) gibt es bewusst nicht.

![WUD Update-Flow](https://raw.githubusercontent.com/HenryHST/minilab/main/docs/diagrams/archify/exports/wud-update-flow.png)

Explorer: [wud-update-flow.html](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/wud-update-flow.html)

## Pushover (Trigger `NXK3`)

Wie bei Gatus: eigene Pushover-App, derselbe User-Key.

| Variable | Wert |
|--|--|
| `WUD_TRIGGER_PUSHOVER_NXK3_TOKEN` | aus `wud-env` (`WUD_PUSHOVER_APP_TOKEN`) |
| `WUD_TRIGGER_PUSHOVER_NXK3_USER` | aus `wud-env` (`GATUS_PUSHOVER_USER_KEY`) |
| `WUD_TRIGGER_PUSHOVER_NXK3_PRIORITY` | `0` (normal, wie Gatus) |
| `WUD_TRIGGER_PUSHOVER_NXK3_SOUND` | `pushover` |
| `WUD_TRIGGER_PUSHOVER_NXK3_MODE` | `simple` — eine Nachricht pro Update |
| `WUD_TRIGGER_PUSHOVER_NXK3_ONCE` | `true` — pro neuem Tag nur einmal |
| `WUD_TRIGGER_PUSHOVER_NXK3_SIMPLETITLE` | `nXk3: ${container.name} ${container.updateKind.remoteValue}` |

Wer lieber eine Sammelnachricht pro Scan möchte, setzt `MODE=batch`. Weitere Stellschrauben:

- `THRESHOLD`: z. B. `minor` (keine Digest-only-Meldungen) oder `major-only`
- `ONDIGEST=false`: Digest-Änderungen ohne neuen Tag nicht melden

Ohne `WUD_PUSHOVER_APP_TOKEN` registriert WUD den Trigger nicht. Im Log steht dann `Some triggers failed to register`.

## MQTT (Trigger `MOSQUITTO`) und Home Assistant

| Variable | Wert |
|--|--|
| `WUD_TRIGGER_MQTT_MOSQUITTO_URL` | `mqtt://mosquitto.mosquitto.svc.cluster.local:1883` |
| `WUD_TRIGGER_MQTT_MOSQUITTO_USER` | `mqtt-wud` (Authentik-Service-Account, Gruppe `mqtt_users`) |
| `WUD_TRIGGER_MQTT_MOSQUITTO_PASSWORD` | aus `wud-env` |
| `WUD_TRIGGER_MQTT_MOSQUITTO_CLIENTID` | `wud-nxk3` |
| `WUD_TRIGGER_MQTT_MOSQUITTO_TOPIC` | `wud/container` |
| `WUD_TRIGGER_MQTT_MOSQUITTO_HASS_ENABLED` | `true` |
| `WUD_TRIGGER_MQTT_MOSQUITTO_HASS_DISCOVERY` | `true` |

WUD veröffentlicht pro Container unter `wud/container/<id>`. Die ID hat das Format `<namespace>_<kind>_<workload>_<container>`, z. B. `status_deployment_gatus_gatus`. Mit Discovery legt Home Assistant unter `homeassistant/…` automatisch Update-Entities an.

Die Compose-WUDs nutzen denselben Broker mit anderen Client-IDs. Die Cluster-Instanz ist an `wud-nxk3` zu erkennen.

Mitlesen:

```bash
kubectl -n mosquitto exec deploy/mqtt-tools -- \
  mosquitto_sub -h mosquitto -u mqtt-probe -P "$PW" -t 'wud/#' -v
```
