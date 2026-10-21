# Übersicht

Gatus ersetzt Uptime Kuma unter `https://status.stadthagen.dev` (nur LAN). Die Historie liegt in CloudNativePG. Login läuft über Authentik-OIDC.

```mermaid
flowchart LR
  Browser --> Traefik
  Traefik --> Gatus
  Gatus --> Authentik
  Gatus --> Postgres
  Gatus --> Prometheus
  Gatus --> Pushover
```

| | |
|--|--|
| Argo App | `gatus` (Wave 3, natives Helm) |
| Chart | `gatus` 1.5.0, App v5.37.0 |
| Namespace | `status` |
| URL | https://status.stadthagen.dev |
| Datenbank | CloudNativePG `gatus-rw`, PostgreSQL 16, 2 Instanzen, 2Gi Longhorn |
| Auth | Authentik-Slug `gatus`, Gruppe `gatus_admins` |
| Alerts | Pushover nach 4 Fehlschlägen; Meta-Alerts PrometheusRule `gatus-alerts` |

Diagramm: [gatus-architektur](../../../diagrams/archify/gatus-architektur.html).

ADR: [0034-gatus-cnpg](../../../adr/0034-gatus-cnpg.md).
