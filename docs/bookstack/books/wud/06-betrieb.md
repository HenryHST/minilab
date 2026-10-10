---
title: Betrieb
book_version: "1.0.0"
---

# Betrieb

## Kubernetes-Watcher

| Variable | Wert |
|--|--|
| `WUD_WATCHER_KUBERNETES_NXK3_CRON` | `0 6 * * *` (wie die Compose-Hosts; `TZ=Europe/Berlin`) |
| `WUD_WATCHER_KUBERNETES_NXK3_WATCHATSTART` | `true` |
| `WUD_WATCHER_KUBERNETES_NXK3_WATCHBYDEFAULT` | `true` |

Ohne Namespace-Angabe beobachtet der Watcher alle Namespaces. Er nutzt den ServiceAccount `wud` mit ClusterRole `wud-reader`: nur `get` und `list` auf Deployments, StatefulSets, DaemonSets, CronJobs, Pods und Nodes.

Einen Scan von Hand startest du in der UI (Admin) oder per Pod-Neustart (`WATCHATSTART`):

```bash
kubectl -n wud rollout restart deploy/wud
```

## Annotations an Workloads

WUD liest Annotations an Deployments usw. (Präfix `getwud.app/`):

```yaml
metadata:
  annotations:
    getwud.app/tag.include: '^\d+\.\d+\.\d+$'   # nur Semver-Tags
    getwud.app/tag.exclude: '-rc'
    getwud.app/watch: "false"                    # Workload ignorieren
    getwud.app/display.name: "Gatus"
    getwud.app/display.icon: "mdi:heart-pulse"
```

Bei mehreren Containern im Pod hängst du `.<container>` an, z. B. `getwud.app/watch.istio-proxy: "false"`.

Die Compose-Labels `wud.tag.include` gelten nur für Docker. Im Cluster nimmst du die Annotations.

## Interne Registry

| Variable | Wert |
|--|--|
| `WUD_REGISTRY_CUSTOM_NXK3_URL` | `https://registry.stadthagen.dev` |
| `WUD_REGISTRY_CUSTOM_NXK3_LOGIN` | `registry` |
| `WUD_REGISTRY_CUSTOM_NXK3_PASSWORD` | aus `wud-env` (`REGISTRY_PASSWORD`) |

WUD ordnet ein Image über den Registry-Host zu. Workloads ziehen interne Images als `registry.stadthagen.dev/…`, deshalb zeigt die URL auf den Traefik-Host und nicht auf `kube-registry.kube-system.svc:5000`.

## Speicher

PVC `wud-store` (1Gi, Longhorn) unter `/store`: Container-Stand, OIDC-Benutzer, Trigger-Historie. Strategie `Recreate`, weil das Volume RWO ist. Geht das PVC verloren, baut WUD den Stand beim nächsten Scan neu auf. Bekannte Updates werden dann erneut gemeldet.

## Update von WUD selbst

1. Neuen Tag und Digest in `apps/ops/wud/deployment.yaml` eintragen
2. Changelog lesen: https://github.com/getwud/wud/releases (Env-Keys ändern sich zwischen Major-Versionen)
3. Push, Argo CD synct

## Troubleshooting

| Symptom | Prüfen |
|--|--|
| Pod `CreateContainerConfigError` | Secret `wud-env` fehlt → `--tags secrets` |
| Keine Container in der UI | `kubectl auth can-i list deployments -A --as=system:serviceaccount:wud:wud` |
| Interne Images ohne Ergebnis | Registry-Login (`REGISTRY_PASSWORD`), DNS `registry.stadthagen.dev` aus dem Pod |
| Keine Pushover-Nachricht | `WUD_PUSHOVER_APP_TOKEN` gesetzt? Log `Some triggers failed to register` |
| MQTT `Not authorized` | `mqtt-wud` in `mqtt_users`, Passwort = `MOSQUITTO_WUD_PASSWORD` |
| Docker-Hub-Rate-Limit | `JITTER` lassen, `WATCHDIGESTDEFAULT` nicht einschalten |

```bash
kubectl -n wud logs deploy/wud --tail=200
```
