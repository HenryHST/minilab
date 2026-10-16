---
title: Ephemeral Storage
book_version: "1.3.0"
---


# Ephemeral Storage

> **Buch** v1.3.0 · Stand: 2026-10-16

## Problem

Unter Node-`DiskPressure` (Worker-Root voll — typisch Longhorn-Daten + Container-Images) evictet der Kubelet Pods **ohne** `ephemeral-storage`-Request bevorzugt. Stirling wurde so beendet, obwohl der Container selbst nur ~100–120 Mi Writable Layer nutzte:

```text
The node was low on resource: ephemeral-storage.
Threshold quantity: …, available: ….
Container stirling-pdf was using …Ki, request is 0, has larger consumption of ephemeral-storage.
```

Zusätzlich zieht das Fat-Image (~1,2 GB) bei jedem Schedule auf einen neuen Node spürbar Disk.

## Gegenmaßnahme (GitOps)

In `apps/dev/stirling-pdf/deployment.yaml`:

| Resource | Request | Limit |
|--|--|--|
| memory | 512Mi | 2Gi |
| cpu | 100m | — |
| **ephemeral-storage** | **2Gi** | **4Gi** |

- **2Gi Request:** passt zum Upload-Limit (`SYSTEMFILEUPLOADLIMIT` / `fileUploadLimit: 2GB`) und verhindert Scheduling auf Nodes ohne genug freien ephemeral space.
- **4Gi Limit:** Kopf für LibreOffice/Tesseract-Temp neben dem Upload.
- **-fat bleibt:** `processExecutor` nutzt LibreOffice + Tesseract.

Kein PVC für Temp nötig, solange Uploads und Konvertierung unter dem Limit bleiben; dauerhafte Daten speichert Stirling hier nicht.

## Betrieb

```bash
# DiskPressure
kubectl get nodes -o custom-columns=NAME:.metadata.name,DISK:.status.conditions[?(@.type==\'DiskPressure\')].status

# Stirling Resources + Node
kubectl -n stirling-pdf get pods -o wide
kubectl -n stirling-pdf get deploy stirling-pdf -o jsonpath='{.spec.template.spec.containers[0].resources}{"\n"}'

# Host-Belegung (Beispiel Worker)
# /var/lib/longhorn  und  /var/lib/rancher/k3s  sind die großen Posten
```

Wenn Worker dauerhaft >80 % Root nutzen: Longhorn-Replicas/Images bereinigen — Stirling allein füllt die Disk nicht.

Abgrenzung: Multipart `EOF in PREAMBLE` ist **kein** DiskPressure — siehe Kapitel **Uploads & OCR**.
