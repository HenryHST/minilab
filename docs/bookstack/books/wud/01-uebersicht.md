---
title: Übersicht
book_version: "1.0.0"
---

# Übersicht

What's up Docker (WUD) prüft jeden Tag, ob es für die Images im nXk3-Cluster neuere Versionen gibt. WUD **meldet nur**: Es aktualisiert nichts selbst, denn die Workloads gehören Argo CD und kommen aus Git. Ein Update heißt also weiterhin: Tag in minilab ändern, Argo CD synct.

![WUD Architektur](https://raw.githubusercontent.com/HenryHST/minilab/main/docs/diagrams/archify/exports/wud-architektur.png)

Explorer: [wud-architektur.html](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/wud-architektur.html)

| | |
|--|--|
| Argo App | `wud` (ApplicationSet `ops`, Wave 3, Plain-Manifeste) |
| Pfad | `apps/ops/wud/` |
| Image | `getwud/wud:9.3.0` (Digest gepinnt) |
| Namespace | `wud` |
| URL | https://wupd.stadthagen.dev |
| Login | Authentik-OIDC, Slug `wupd` — `wupd_admins` = Admin, `wupd_users` = nur lesen |
| Watcher | Kubernetes, alle Namespaces, täglich 06:00 |
| Registries | Docker Hub, GHCR, Quay + intern `registry.stadthagen.dev` |
| Meldungen | Pushover (Trigger `NXK3`) und MQTT → Home Assistant |
| Monitoring | ServiceMonitor `/metrics`, Grafana-Dashboard, Gatus `/health` |
| Speicher | PVC `wud-store` 1Gi Longhorn (`/store`) |

## Abgrenzung zu den Compose-WUDs

Auf `auth`, `pi3cl`, `pi5cl` und `s04` laufen weiter eigene WUD-8.3.0-Container per Docker Compose. Sie beobachten die Docker-Hosts. Die Cluster-Instanz beobachtet nur nXk3 und ändert an den Compose-Instanzen nichts.

## Ablauf in Kurzform

1. Der Kubernetes-Watcher listet Deployments, StatefulSets, DaemonSets und CronJobs.
2. Für jedes Image fragt WUD die Registry nach Tags.
3. Gibt es einen neueren passenden Tag, schickt WUD eine Pushover-Nachricht und veröffentlicht den Stand per MQTT.
4. Home Assistant zeigt jedes Image als Update-Entity.

Details: [Kapitel Benachrichtigungen](04-benachrichtigungen.md).
