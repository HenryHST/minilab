# wud — What's up Docker 9.3.0

[WUD](https://getwud.app) reports new image versions for every workload in the nXk3 cluster. **Notify only**: no update triggers, because Argo CD owns the workloads from Git.

| | |
|---|---|
| Namespace | `wud` |
| URL | `https://wupd.stadthagen.dev` (Traefik TLS, cert-manager) |
| Image | `getwud/wud:9.3.0` (digest-pinned) |
| Auth | WUD-native OIDC → Authentik provider `wupd`; `wupd_admins` = admin, `wupd_users` = read-only, everyone else denied |
| Watcher | `kubernetes.nxk3` — in-cluster ServiceAccount, all namespaces, daily 06:00 (Europe/Berlin) |
| Registries | Docker Hub/GHCR/Quay (built-in) + `custom.nxk3` → `https://registry.stadthagen.dev` (user `registry`) |
| Triggers | `pushover.nxk3` (one message per update) + `mqtt.mosquitto` (`wud/container/#`, Home Assistant discovery) |
| Storage | PVC `wud-store` 1Gi Longhorn → `/store` |
| Metrics | `/metrics` via ServiceMonitor `wud` (not exposed on the IngressRoute) |
| Sync wave | `3` (ApplicationSet `ops`) |
| Docs | BookStack book [`docs/bookstack/books/wud`](../../../docs/bookstack/books/wud/) |

## Prerequisites (Infra_LAB)

1. Terraform `terraform/authentik` (dev): provider `wupd` with redirect `https://wupd.stadthagen.dev/auth/oidc/authentik/cb`, pinned `wupd_oauth_client_secret`, service account `mqtt-wud` (`mqtt_wud_password`).
2. SecretSpec: `WUD_OAUTH_CLIENT_SECRET`, `MOSQUITTO_WUD_PASSWORD`, `WUD_PUSHOVER_APP_TOKEN` (+ reused `GATUS_PUSHOVER_USER_KEY`, `REGISTRY_PASSWORD`).
3. `ansible-playbook site.yaml --tags secrets` → Secret `wud-env` (keys are WUD env names, loaded via `envFrom`).
4. DNS `wupd.stadthagen.dev` → Traefik.

Without Secret `wud-env` the pod stays in `CreateContainerConfigError`. Missing values inside it are skipped: without `WUD_PUSHOVER_APP_TOKEN` the Pushover trigger fails validation and is not registered; the rest keeps working.

## Workload annotations

WUD reads annotations on Deployments/StatefulSets/DaemonSets/CronJobs (prefix `getwud.app/`):

```yaml
metadata:
  annotations:
    getwud.app/tag.include: '^\d+\.\d+\.\d+$'   # semver only
    getwud.app/watch: "false"                    # opt out
    getwud.app/display.name: "Gatus"
```

## RBAC

ClusterRole `wud-reader`: `get`/`list` on deployments, statefulsets, daemonsets, cronjobs, pods, nodes. No write verbs.
