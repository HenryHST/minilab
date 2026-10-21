# ADR-0034: Gatus statt Uptime Kuma, Postgres auf CloudNativePG

- **Status:** Accepted
- **Datum:** 2026-10-08
- **Kontext:** `apps/monitoring/gatus/`, Namespace `status`, Hostname `status.stadthagen.dev`

## Kontext

Uptime Kuma lief als Plain-Manifest im Namespace `uptimekuma` mit SQLite ([ADR-0012](0012-uptime-kuma-sqlite-local-pv.md)). ICMP brauchte `NET_RAW` und damit PSS `privileged`. Historie und Konfiguration lagen in einer Datei, Backup war ein tar.

Gatus deckt dieselben HTTP-Checks ab, spricht OIDC und legt die Historie in Postgres. Der Cluster hat CloudNativePG bereits ([ADR-0030](0030-cloudnative-pg.md)).

## Entscheidung

| Thema | Wahl |
|-------|------|
| App | Gatus, Helm-Chart `gatus` 1.5.0 (App v5.37.0) aus `https://twin.github.io/helm-charts`, nativ in Argo ([ADR-0014](0014-helm-strategie.md)) |
| Argo-App | `gatus`, Extras unter `apps/monitoring/gatus/manifests/` |
| Namespace | `status` (ersetzt `uptimekuma`) |
| URL / TLS | `https://status.stadthagen.dev`, Certificate-DNS unverändert, Secret `status-tls` |
| Datenbank | CloudNativePG, **2 Instanzen**, PostgreSQL 16, 2Gi Longhorn, Service `gatus-rw`, `sslmode=require` |
| Auth | OIDC gegen Authentik, Slug `gatus`. Zugriff nur Gruppe `gatus_admins` (Gatus wertet keine Gruppenrollen aus) |
| Checks | Gruppe `homelab`: HTTP 200. Gruppe `apps`: HTTP 200. Gruppe `plattform`: Health-Pfade (inkl. WUD). Gruppe `sso`: `ignore-redirect`, Status **302**. Gruppe `storage`: RustFS. Gruppe `extern`: Pangolin und Mail. Intervalle 1m/2m/5m; Pushover nach 4 Fehlern. NFS-Backups: Wartungsfenster ohne Pushover. Kein ICMP |
| Alerts | Pushover, eigener Application-Token, User-Key wie Argo CD Notifications |
| Metriken | `metrics: true`, ServiceMonitor mit Label `release: kube-prometheus-stack`, plus PodMonitor der CNPG-Instanz |
| PSS | `baseline` (kein `NET_RAW`) |
| Backup | Longhorn-Snapshot alle 6h und `pg_dump` 01:00 UTC nach NFS `gatus-backups` ([ADR-0015](0015-backup-restore-cronjobs.md)) |

Kuma-Monitore und die SQLite-Datei werden nicht migriert.

## Konsequenzen

- [ADR-0012](0012-uptime-kuma-sqlite-local-pv.md) ist abgelöst.
- Secrets `gatus-db` und `gatus-env` müssen vor dem ersten Sync existieren (Infra_LAB SecretSpec).
- Authentik-dev: Application `uptime_kuma` aus, Application `gatus` an. Prod-IdP behält Uptime Kuma.
- Kurz kein Zertifikat, bis cert-manager `status.stadthagen.dev` im neuen Namespace ausstellt.
- `https://status.stadthagen.dev/uebersicht` ist ohne Login und zeigt nur Health-Badges. Die Historie bleibt hinter OIDC.

### Stabilität (2026-10-21)

- Gatus-Deployment bleibt bei **1 Replica** (`RollingUpdate`, PriorityClass `gatus-prefer`): kein Upstream-HA / Leader-Election.
- CNPG auf 2 Instanzen für History-HA; Volume 2Gi.
- Meta-Monitoring: PrometheusRule `gatus-alerts` im kube-prometheus-stack.
