---
title: Übersicht
book_version: "1.2.0"
---


# Übersicht

> **Buch** v1.2.0 · Stand: 2026-10-14

Stirling-PDF ist das PDF-Toolkit unter https://stirling-pdf.stadthagen.dev (Argo ApplicationSet `dev`, Namespace `stirling-pdf`).

| | |
|--|--|
| Image | `stirlingtools/stirling-pdf:3.1.0-fat` (LibreOffice + Tesseract) |
| Workers | `nodeSelector: worker=true` |
| Upload | `fileUploadLimit: 2GB` (nur App — **kein** Traefik-Buffering) |
| Auth | ohne Authentik-OIDC (Standalone) |

LibreOffice-/OCR-Jobs brauchen das **-fat**-Image; die schlanke Variante reicht dafür nicht.

Details zu DiskPressure und `ephemeral-storage`: Kapitel **Ephemeral Storage**.

Große Uploads / OCR / Multipart-EOF: Kapitel **Uploads & OCR**.
