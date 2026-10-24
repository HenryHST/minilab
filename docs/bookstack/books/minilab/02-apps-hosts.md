---
title: Apps & Hosts
book_version: "1.2.1"
updated: "2026-10-24"
---

# Apps & Hosts

> **Buch** v1.2.1 · Stand: 2026-10-24

Kurzübersicht der User-Apps (Details und Sync Waves: Root-README im Git-Repo).

| App | Host | Hinweis |
|-----|------|---------|
| BookStack | book.stadthagen.dev | Wissensdatenbank, Authentik OIDC |
| Home Assistant | ha02.stadthagen.dev | Smart Home (Host außerhalb k3s; Pangolin Site Stadthagen-pro) |
| Registry | registry.stadthagen.dev | Distribution `registry:3`; htpasswd User `registry` — Buch **registry** |
| Registry UI | registry-ui.stadthagen.dev | Joxit; Authentik ForwardAuth + Registry-Basic (`REGISTRY_SECURED`) |
| Termix | termix.stadthagen.dev | SSH-Terminal, OIDC |
| Vaultwarden | vw-ext.stadthagen.dev (LAN `vaultwarden.` → Redirect) | Passwort-Safe, SSO |
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

## Ops-Images (Helper)

| Image | Verwendung |
|-------|------------|
| `git.stadthagen.dev/ops/k8s-toolbox:1.0.1` | Backup-/Restore-/GC-Jobs (ersetzt `alpine/k8s`); Multi-Arch; Mirror `registry.stadthagen.dev/ops/k8s-toolbox` |
| Jetstack cert-manager **v1.21.2** | TLS / DNS-01 (CVE-2026-84304 / grpc) |

Build/CI: Forgejo `ops/k8s-toolbox` (SoT) · Sync-Tree `apps/ops/k8s-toolbox/` · optional GHCR `ghcr.io/henryhst/k8s-toolbox`. Pull: Secret `registry-pull`.

Paperless Trivy-Residuals (App/Gotenberg Upstream): Buch **Paperless** → Trivy & CVE-Hygiene.

Release: minilab **v0.15.0** · Plattform Infra_LAB **v1.16.0**.
