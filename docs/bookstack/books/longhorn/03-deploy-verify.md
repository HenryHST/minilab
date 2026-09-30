---
title: Deploy und Verify
book_version: "1.0.0"
---

# Deploy und Verify

## Voraussetzungen

1. ApplicationSet `infra` enthält `longhorn` (Wave 1, `extras: true`, Chart `v1.12.1`).
2. AppProject `infra` erlaubt Destination `longhorn-system`.
3. Nodes `nxk3-w01` bis `w03` tragen `node.longhorn.io/create-default-disk=true`.
4. Der NFS-Export `192.168.0.25:/var/nfs/shared/infra01/longhorn-backups` ist mit NFSv3 erreichbar.

## Sync

```bash
kubectl -n argocd get application longhorn
kubectl -n longhorn-system get pods,deploy
kubectl get sc longhorn
kubectl get volumesnapshotclass longhorn
```

## Checks

1. Manager- und UI-Pods in `longhorn-system` sind Ready.
2. `kubectl get sc longhorn` zeigt Provisioner `driver.longhorn.io` und das Annotation-Flag der Default-Klasse.
3. `https://longhorn.stadthagen.dev` lädt die Oberfläche.
4. `kubectl -n longhorn-system get deploy snapshot-controller` ist Ready.
5. `kubectl get volumesnapshotclass longhorn` zeigt Driver `driver.longhorn.io` und `type: snap`.
6. Ein gebundenes PVC, zum Beispiel `termix-1` im Namespace `termix`, nutzt die Klasse `longhorn`.

Ein PVC, das auf `Pending` stehen bleibt, ist kein Sync-Fehler der App. Dann fehlt planbarer Platz. Kapitel **Onboarding**.
