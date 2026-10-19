---
title: Home Assistant
chapter: home-assistant
---

# Home Assistant → podcraft

HA läuft auf pi5cl (Config unter `/opt/homelab/data/homeassistant/config`, nicht in Git). podcraft exponiert OpenAPI unter `https://podcraft.stadthagen.dev`.

Der Day/Night-Scheduler läuft **in podcraft**. HA wird für manuelle Overrides und Sensoren genutzt.

## rest_command (Beispiel)

In `configuration.yaml` (oder `packages/podcraft.yaml`):

```yaml
rest_command:
  podcraft_start_drawio:
    url: "https://podcraft.stadthagen.dev/api/v1/workloads/drawio/start"
    method: POST
    username: !secret podcraft_basic_user
    password: !secret podcraft_basic_password
  podcraft_stop_drawio:
    url: "https://podcraft.stadthagen.dev/api/v1/workloads/drawio/stop"
    method: POST
    username: !secret podcraft_basic_user
    password: !secret podcraft_basic_password
  podcraft_start_it_tools:
    url: "https://podcraft.stadthagen.dev/api/v1/workloads/it-tools/start"
    method: POST
    username: !secret podcraft_basic_user
    password: !secret podcraft_basic_password
  podcraft_stop_it_tools:
    url: "https://podcraft.stadthagen.dev/api/v1/workloads/it-tools/stop"
    method: POST
    username: !secret podcraft_basic_user
    password: !secret podcraft_basic_password
```

Hinweise:

- Mit ForwardAuth allein reichen Browser-Cookies nicht für `rest_command`. Für HA entweder `PODCRAFT_AUTH_MODE=both` + Basic-Secret, oder einen internen Cluster-Service/`rest_command` gegen den Service-DNS mit Network-Pfad.
- Alternativ: long-lived token / App-Password hinter Basic (Secret in HA `secrets.yaml`).

## Sensor (optional)

```yaml
rest:
  - resource: https://podcraft.stadthagen.dev/api/v1/workloads/drawio
    username: !secret podcraft_basic_user
    password: !secret podcraft_basic_password
    scan_interval: 60
    sensor:
      - name: Podcraft drawio desired
        value_template: "{{ value_json.desired }}"
```

## Automation (manuell)

```yaml
automation:
  - alias: "podcraft drawio on demand"
    trigger:
      - platform: state
        entity_id: input_boolean.podcraft_drawio
        to: "on"
    action:
      - service: rest_command.podcraft_start_drawio
```

Custom Integration (OpenAPI-Client) ist bewusst später — Spec zuerst stabil halten.
