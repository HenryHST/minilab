---
title: Home Assistant
chapter: home-assistant
---

# Home Assistant → podcraft

HA läuft auf **pi5cl** (Config unter `/opt/homelab/data/homeassistant/config`, nicht in Git).  
podcraft: `https://podcraft.stadthagen.dev`

Der Day/Night-Scheduler läuft **in podcraft**. HA dient für manuelle Overrides und optionale Status-Sensoren.

## Voraussetzungen (podcraft)

1. `PODCRAFT_AUTH_MODE=both` (Browser OIDC + HA Basic)
2. Ingress: `PathPrefix(/api/v1/workloads)` **ohne** Authentik-ForwardAuth, mit Traefik-IP-Allowlist (LAN/Privatnetze)
3. UI / Admin-APIs (inkl. Passwort-Rotate) weiter mit ForwardAuth
4. NetworkPolicy: nur Traefik → podcraft-Pods (unverändert)

## Credentials holen

1. Als Authentik-User in der Pulse-UI anmelden: `https://podcraft.stadthagen.dev`
2. **Systemeinstellungen** öffnen
3. **HA-Passwort rotieren** — Username und Passwort erscheinen **einmalig** in der Settings-Card (Copy-Buttons)
4. Werte sofort in HA `secrets.yaml` übernehmen (nach Reload der Settings-Seite ist der Klartext weg)

## Auf pi5cl: secrets.yaml

```yaml
podcraft_basic_user: ha
podcraft_basic_password: "<einmalig angezeigtes Passwort>"
```

## rest_command

In `configuration.yaml` oder besser `packages/podcraft.yaml`:

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

## Automation (optional)

```yaml
input_boolean:
  podcraft_drawio:
    name: podcraft drawio

automation:
  - alias: "podcraft drawio on demand"
    trigger:
      - platform: state
        entity_id: input_boolean.podcraft_drawio
        to: "on"
    action:
      - service: rest_command.podcraft_start_drawio
  - alias: "podcraft drawio off"
    trigger:
      - platform: state
        entity_id: input_boolean.podcraft_drawio
        to: "off"
    action:
      - service: rest_command.podcraft_stop_drawio
```

## Aktivieren

Entwicklerwerkzeuge → YAML-Konfiguration neu laden (oder Core neu starten).  
Service prüfen: `rest_command.podcraft_start_drawio`.

## Netz

- pi5cl muss `podcraft.stadthagen.dev` erreichen (LAN → Traefik VIP).
- Kein Authentik-Login in HA nötig — nur HTTP Basic.
- k8s-NetworkPolicy steuert nur Traefik→Pod; die HA-spezifische Einschränkung ist die Traefik-Allowlist auf `/api/v1/workloads`.

## Troubleshooting

| Symptom | Ursache / Fix |
|---------|----------------|
| 401 / Redirect zu Authentik | Request geht nicht über die Workloads-Route oder Basic falsch |
| 403 von Traefik | Client-IP nicht in `podcraft-api-allowlist` |
| 401 von podcraft | Passwort nicht rotiert / falsche Secrets / Mode nicht `both` |
| Rotate in UI schlägt fehl | Nicht per OIDC eingeloggt, oder Secret-RBAC fehlt |

Custom Integration (OpenAPI-Client) ist bewusst später — Spec zuerst stabil halten.
