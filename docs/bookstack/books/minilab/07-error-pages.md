# Error / Maintenance Pages

Clusterweite Fehlerseiten hinter Traefik (`error-pages`).

## Was wird abgefangen?

| Fall | Verhalten |
|------|-----------|
| Backend liefert **500–504** | Traefik Errors-Middleware → Custom `lost-in-space` + Gatus-Badges |
| Unbekannter Host (kein Ingress) | Catch-all IngressRoute → 404-Seite (gleiches Template) |
| Authentik **401/403**, API-4xx | **unverändert** (bewusst kein Rewrite) |

Links: [Status / Übersicht](https://status.stadthagen.dev/uebersicht), [Home](https://web.stadthagen.dev). Badges laden als öffentliche Gatus-SVGs im Browser (Kern-Set; volle Liste auf `/uebersicht`).

## GitOps

- App: `apps/infra/error-pages/` · Namespace `error-pages` · Sync wave 1
- Chart: OCI `error-pages` (native Argo Helm); Pin: `applicationset-infra.yaml` → `helmVersion`
- Extras: Catch-all IngressRoute, NetworkPolicy, ConfigMap HTML-Template (`templates/lost-in-space-gatus.tpl.html`)

```mermaid
flowchart LR
  Client --> Traefik
  Traefik -->|"matched + 5xx"| MW["Middleware"]
  MW --> EP["error-pages"]
  Traefik -->|"unknown host"| CatchAll["Catch-all"]
  CatchAll --> EP
```

## Traefik (Ansible)

Middleware am Entrypoint `websecure` und `allowCrossNamespace` kommen aus Infra_LAB (`henryhst.k3s.traefik`). Reihenfolge: Argo-App syncen → `ansible-playbook site.yaml --tags traefik`.

Details: [ADR-0024](../../../adr/0024-error-pages.md), App-README `apps/infra/error-pages/README.md`.
