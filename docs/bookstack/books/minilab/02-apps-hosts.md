# Apps & Hosts

Kurzübersicht der User-Apps (Details und Sync Waves: Root-README im Git-Repo).

| App | Host | Hinweis |
|-----|------|---------|
| BookStack | book.stadthagen.dev | Wissensdatenbank, Authentik OIDC |
| Home Assistant | ha02.stadthagen.dev | Smart Home (Host außerhalb k3s; Pangolin Site Stadthagen-pro) |
| Registry | registry.stadthagen.dev | Distribution `registry:3`, ClusterIP + Traefik |
| Registry UI | registry-ui.stadthagen.dev | Joxit; Authentik ForwardAuth |
| Termix | termix.stadthagen.dev | SSH-Terminal, OIDC |
| Vaultwarden | vaultwarden.stadthagen.dev | Passwort-Safe, SSO |
| Web (Homepage) | web.stadthagen.dev | Startseite / Widgets |
| Gatus | status.stadthagen.dev | Health-Dashboard, Authentik OIDC, CloudNativePG |
| Draw.io | drawio.stadthagen.dev | Diagramme |
| IT Tools / Omni Tools | it-tools / omni-tools | Utility-Apps |
| Headlamp | headlamp.stadthagen.dev | Cluster-UI |
| Grafana | grafana.stadthagen.dev | Dashboards & Alerting |
| Stirling PDF | (Ingress laut App) | Worker-Pin; Memory/Metaspace erhöht |
| SearXNG | searxng.stadthagen.dev | Metasuche, LAN Traefik LB; kein SSO |
| Kromgo | kromgo.stadthagen.dev | Prometheus-Badges (LAN); kein SSO |
| ByteStash | bytestash.stadthagen.dev | Snippets, Authentik OIDC; LAN |
| Karakeep | karakeep.stadthagen.dev (+ karakeep-ext) | Bookmarks, Authentik OIDC; Pangolin Ext |
| Paperless | paperless.stadthagen.dev (+ paperless-ext disabled) | Dokumente OCR, Authentik OIDC; HPScan consume |
| Error-Pages | (kein eigener Host) | Traefik 500–504 + Catch-all; ADR-0024 |

Workloads liegen unter `apps/{infra,monitoring,ops,dev}/` und werden von vier ApplicationSets verwaltet (ADR-0022). Ops-Notiz HA: [`../../../home-assistant/ha02.md`](../../../home-assistant/ha02.md).

Release: minilab **v0.8.0** · Plattform Infra_LAB **v1.6.0**.
