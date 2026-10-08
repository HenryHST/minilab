# ADR-0012: Uptime Kuma — SQLite und Local PV

- **Status:** Superseded by ADR-0034
- **Datum:** 2026-09-11
- **Kontext:** `apps/monitoring/status/`, Namespace `uptimekuma`

## Kontext

Uptime Kuma v2 unterstützt SQLite, externes MariaDB und Embedded MariaDB. Homelab-Last ist moderat (Argo-Status, begrenzte Monitore, 1 Replica). Cluster-Storage war bei Einführung knapp; ICMP-Monitore brauchen `NET_RAW`.

## Entscheidung

| Thema | Wahl |
|-------|------|
| DB | **SQLite** (kein Embedded MariaDB; externes MariaDB nur bei spürbaren Problemen) |
| Persistenz | **Local PV/PVC** auf Node **`pi4cl`** (kein Longhorn; Node-Pin) |
| Replicas | 1, `Recreate` (single-writer) |
| PSS | `enforce: baseline` (wegen `NET_RAW`), `audit`/`warn: restricted` |

Backup/Restore lag bei [ADR-0015](0015-backup-restore-cronjobs.md). Abgelöst durch [ADR-0034](0034-gatus-cnpg.md) (Gatus, CloudNativePG, Namespace `status`).

## Konsequenzen

- Kein HA für Status-UI; Pin an `pi4cl`.
- Wechsel auf Longhorn/MariaDB nur bei klaren Betriebsgründen (Pin stört, Korruption, Last).
