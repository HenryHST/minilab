---
title: Snapshots und Backup
book_version: "1.0.0"
---

# Snapshots und Backup

Drei Kopien, drei verschiedene Wege. Sie ersetzen sich nicht.

| | Snapshot | Longhorn-Backup | App-Dump |
|--|--|--|--|
| Was | CSI-VolumeSnapshot auf dem Volume | Kopie zum NAS | `pg_dump` oder Archiv der App |
| Klasse / Ziel | `VolumeSnapshotClass` `longhorn`, `type: snap` | `nfs://192.168.0.25:/var/nfs/shared/infra01/longhorn-backups` | eigener NFS-Export der App |
| Beispiel | Termix `ScheduledBackup` `termix-snapshot` | Backup-Target in den Longhorn-Settings | `termix-backup-cron` nach `termix-backups` |
| Restore | neuer Cluster oder PVC aus dem Snapshot | Longhorn-Restore aus dem Backup-Target | SQL oder das Restore-Job der App |

NFSv4 auf diesem NAS liefert „No such file or directory“. Das Backup-Target hängt deshalb mit `nfsOptions=nfsvers=3,nolock`.

## Snapshot-Controller

Die CRDs `snapshot.storage.k8s.io` und `groupsnapshot.storage.k8s.io` kommen aus kubernetes-csi/external-snapshotter v8.6.0 und liegen in `apps/infra/longhorn/manifests/snapshot-crds.yaml`. Das Deployment `snapshot-controller` (Image `registry.k8s.io/sig-storage/snapshot-controller:v8.6.0`) läuft in `longhorn-system`, eine Replik, Leader-Election an.

Die Klasse:

| | |
|--|--|
| Name | `longhorn` |
| Driver | `driver.longhorn.io` |
| `deletionPolicy` | Delete |
| `type` | `snap` |

`type: snap` bleibt auf dem Longhorn-Volume. `bak` wäre der Weg ins Backup-Target und ist hier nicht gesetzt.

CloudNativePG erkennt die CRD nur beim Start des Operators. Nach dem ersten Anlegen der CRDs den Operator einmal neu starten, sonst lehnt ein `ScheduledBackup` mit `method: volumeSnapshot` ab.

## Termix

Cluster `termix` setzt `spec.backup.volumeSnapshot.className: longhorn`, online, `snapshotOwnerReference: backup`. `ScheduledBackup` `termix-snapshot` läuft alle 6 Stunden (`0 15 */6 * * *`) und legt beim ersten Anlegen sofort ein Backup an. Das ist kein WAL-Archiv. Der Restore-Punkt ist der letzte erfolgreiche Snapshot. Der nächtliche `pg_dump` bleibt die Kopie außerhalb des Volumes.

Eine Aufbewahrungsfrist wie bei Barman gibt es für diese Snapshots nicht. `snapshotOwnerReference: backup` löscht den Snapshot zusammen mit dem Backup-Objekt.
