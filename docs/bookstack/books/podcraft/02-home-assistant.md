---
title: Home Assistant
chapter: home-assistant
---

# Home Assistant → podcraft

HA läuft auf **ha02** (`hassio@192.168.0.106`, Config unter `/config`, nicht in Git; früher pi5cl).  
podcraft: `https://podcraft.stadthagen.dev`

Der Day/Night-Scheduler läuft **in podcraft**. HA dient für manuelle Overrides und optionale Status-Sensoren.

## Voraussetzungen (podcraft)

1. `PODCRAFT_AUTH_MODE=both` (Browser OIDC + HA Basic)
2. Ingress: `/api/v1/workloads` **nur mit** `Authorization: Basic …` ohne ForwardAuth (+ Traefik-IP-Allowlist). Browser ohne Basic → Authentik.
3. UI / Admin-APIs (inkl. Passwort-Rotate) weiter mit ForwardAuth
4. NetworkPolicy: nur Traefik → podcraft-Pods (unverändert)

## Fertiges Beispiel-Package

Vollständige Dateien im Repo:

- [`examples/homeassistant/podcraft.yaml`](../../../apps/dev/podcraft/examples/homeassistant/podcraft.yaml) → nach `config/packages/podcraft.yaml`
- [`examples/homeassistant/secrets.yaml.example`](../../../apps/dev/podcraft/examples/homeassistant/secrets.yaml.example) → Keys in `secrets.yaml`

`configuration.yaml` (falls Packages noch fehlen):

```yaml
homeassistant:
  packages: !include_dir_named packages
```

## Credentials holen

1. Als Authentik-User in der Pulse-UI anmelden: `https://podcraft.stadthagen.dev`
2. **Systemeinstellungen** öffnen
3. **HA-Passwort rotieren** — Username und Passwort erscheinen **einmalig** in der Settings-Card (Copy-Buttons)
4. Werte sofort in HA `secrets.yaml` übernehmen (nach Reload der Settings-Seite ist der Klartext weg)

## Auf ha02: secrets.yaml

```yaml
podcraft_basic_user: ha
podcraft_basic_password: "<einmalig angezeigtes Passwort>"
```

## Aktivieren

Entwicklerwerkzeuge → YAML-Konfiguration neu laden (oder Core neu starten).  
Service prüfen: `rest_command.podcraft_start_drawio`.

## Netz

- ha02 muss `podcraft.stadthagen.dev` erreichen (LAN → Traefik VIP).
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
