---
title: Uploads & OCR
book_version: "1.1.0"
---

# Uploads & OCR

> **Buch** v1.1.0 · Stand: 2026-10-14

## Symptom

```text
POST /api/v1/misc/ocr-pdf
MultipartException: Failed to parse multipart servlet request
Caused by: java.io.EOFException: unexpected EOF in PREAMBLE
```

Stirling/Jetty bricht ab, weil der Request-Body unvollständig ankommt — typisch durch einen Proxy, der den Multipart-Stream nicht durchreicht.

## Ursache

Die Traefik-Middleware `stirling-pdf-upload` nutzte **`buffering.maxRequestBodyBytes: 2Gi`**. Buffering lädt den **gesamten** Body in Traefik (Memory/Temp), bevor er an Stirling geht. Bei großen PDFs / DiskPressure auf dem Traefik-Node wird der Stream abgeschnitten → `bad multipart` / `EOF in PREAMBLE`.

Die App limitiert Uploads bereits selbst (`fileUploadLimit: 2GB` / `SYSTEMFILEUPLOADLIMIT`).

## Fix

- Buffering-Middleware **entfernt** (Größe nur noch in der App).
- `ServersTransport` `stirling-pdf` mit `responseHeaderTimeout: 35m` (OCR/LibreOffice bis 30 min in `processExecutor`).

Manifest: `apps/dev/stirling-pdf/ingressroute.yaml`.

## Verify

```bash
kubectl -n stirling-pdf get middleware   # stirling-pdf-upload darf nicht existieren
kubectl -n stirling-pdf get serverstransport stirling-pdf -o yaml
# UI: kleines PDF unter OCR hochladen — kein MultipartException in den Logs
kubectl -n stirling-pdf logs deploy/stirling-pdf --since=5m | rg -i 'multipart|ocr-pdf|ERROR' || true
```
