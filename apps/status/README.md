# Uptime Kuma (`status`)

Argo Application `status` → namespace `uptimekuma`, URL `https://status.stadthagen.dev`.

## Database (SQLite — bewusst)

Uptime Kuma **v2** unterstützt SQLite, externes MariaDB/MySQL und Embedded MariaDB. Für dieses Homelab (Argo-App-Status, moderate Monitor-Anzahl, 1 Replica) bleibt **SQLite**.

| Option | Entscheidung |
|--------|----------------|
| **SQLite** (aktuell) | Beibehalten — einfach, wenig RAM auf dem Pi, Backup = tar von `/app/data` |
| Externes MariaDB | Nur wenn SQLite spürbar langsam wird oder oft korrupt ist (viele Monitore / kurze Intervalle) |
| Embedded MariaDB | Nicht nutzen — hoher RAM-Verbrauch, kein Vorteil bei 1 Replica |

Uptime Kuma bleibt **single-writer** (`replicas: 1`, `Recreate`); ein separates MariaDB ändert das nicht.

Offizielle Hinweise: [Migration v1→v2](https://github.com/louislam/uptime-kuma/wiki/Migration-From-v1-To-v2) (kein Direct-Convert SQLite→MariaDB).

## Persistence

- **Longhorn PVC** `uptimekuma-data` (1Gi, `longhorn-loki-local`, 1 Replica) — kein Node-Pin; Cluster-Nodes sind `nxk3-*` (kein `pi4cl`)
- Deployment + Restore ohne `nodeSelector`
- NFS-Backups unverändert (`uptimekuma-backups`)

## Pod Security (privileged enforce — NET_RAW for ICMP)

Namespace `uptimekuma`:

| Label | Wert | Grund |
|-------|------|-------|
| `enforce` | `privileged` | ICMP-Ping braucht `NET_RAW` — unter `baseline`/`restricted` verboten |
| `audit` / `warn` | `baseline` | Abweichungen vom Baseline-Profil sichtbar halten |

Deployment: `runAsUser`/`fsGroup` 1000, `capabilities.drop: [ALL]`, `capabilities.add: [NET_RAW]`, `seccompProfile: RuntimeDefault`

## Backup / Restore

- CronJob `kuma-backup-cron` (01:00 UTC): `tar` von `/app/data` → NFS `192.168.0.25:/var/nfs/shared/infra01/uptimekuma-backups` (Retention 7)
- Manuell: `kubectl -n uptimekuma create job --from=cronjob/kuma-backup-cron kuma-backup-manual`
- Bootstrap: ConfigMap `uptimekuma-restore` → `enabled=true` (+ `force=true` wenn `kuma.db` schon existiert) → Argo Sync → danach sofort `enabled=false` committen
