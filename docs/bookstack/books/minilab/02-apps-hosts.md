# Apps & Hosts

Kurzübersicht der User-Apps (Details und Sync Waves: Root-README im Git-Repo).

| App | Host | Hinweis |
|-----|------|---------|
| BookStack | book.stadthagen.dev | Wissensdatenbank, Authentik OIDC |
| Home Assistant | ha02.stadthagen.dev | Smart Home (Host ha02, Pangolin Site Stadthagen-pro — nicht k3s-Workload) |
| Home Assistant | ha02.stadthagen.dev | Smart Home (Host außerhalb k3s; Pangolin Site Stadthagen-pro) |
| Termix | termix.stadthagen.dev | SSH-Terminal, OIDC |
| Vaultwarden | vaultwarden.stadthagen.dev | Passwort-Safe, SSO |
| Web (Homepage) | web.stadthagen.dev | Startseite / Widgets |
| Status | status.stadthagen.dev | Uptime Kuma |
| Draw.io | drawio.stadthagen.dev | Diagramme |
| IT Tools / Omni Tools | it-tools / omni-tools | Utility-Apps |
| Headlamp | headlamp.stadthagen.dev | Cluster-UI |
| Grafana | grafana.stadthagen.dev | Dashboards & Alerting |

Infrastruktur (Longhorn, cert-manager, Loki, …) liegt unter `infra/` und wird vom ApplicationSet `infra` verwaltet. Ops-Notiz HA: [`../../../home-assistant/ha02.md`](../../../home-assistant/ha02.md).
