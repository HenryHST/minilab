---
title: Uploads & OCR
book_version: "1.3.0"
---

# Uploads & OCR

> **Buch** v1.3.0 · Stand: 2026-10-16

Fehleranalyse und Fix für Multipart-/OCR-Uploads hinter Traefik (`POST /api/v1/misc/ocr-pdf`).

## Symptom

UI-OCR (und ggf. andere Multipart-Tools) schlagen fehl. In den Stirling-Logs:

```text
ERROR … GlobalExceptionHandler - Unexpected RuntimeException at /api/v1/misc/ocr-pdf:
  Failed to parse multipart servlet request
org.springframework.web.multipart.MultipartException: Failed to parse multipart servlet request
Caused by: org.eclipse.jetty.http.HttpException$IllegalStateException: 400: bad multipart
Caused by: java.io.EOFException: unexpected EOF in PREAMBLE
```

Jetty parst den Multipart-Body und trifft **Ende des Streams, bevor die erste Boundary** kommt. Der Request erreicht die OCR-Logik nicht — es ist kein Tesseract-/OCRmyPDF-Fehler.

Betroffen war u. a. User `admin` (Session/JWT); MFA-Logs direkt vor dem Fehler sind normal und **keine** Ursache.

## Fehleranalyse (2026-10-14)

### Was es *nicht* war

| Hypothese | Ergebnis | Evidenz |
|--|--|--|
| HTTP/2 an sich kaputt | **verworfen** | `curl --http2` + gültiges Multipart + `X-API-KEY` → **HTTP 200** und PDF |
| Jetty Temp/Disk voll | **verworfen** | `/tmp` und Overlay hatten freien Platz; `ephemeral-storage` Request/Limit gesetzt |
| Fehlende OCR-Tools im Image | **verworfen** | Image `3.1.0-fat`; nach erfolgreichem Parse lief OCRmyPDF (andere Fehler wären Exit-Code/IO, nicht PREAMBLE) |
| IngressRoute noch mit Buffering | **verworfen** (nach Fix) | Live-IR ohne Middlewares; Argo Synced auf Commit ohne `stirling-pdf-upload` |

Unauthentizierte Probes (`401 Authentication required`) beweisen **keinen** Multipart-Parse — Auth greift vorher. Zum Nachweis braucht es einen authentifizierten Upload.

### Was es *war*

| Hypothese | Ergebnis | Evidenz |
|--|--|--|
| Traefik **`buffering`** schneidet Multipart ab | **bestätigt (Root Cause Infra)** | Middleware `stirling-pdf-upload` mit `maxRequestBodyBytes: 2Gi` puffert den **gesamten** Body in Traefik, bevor Stirling ihn sieht. Bei großen Bodies / Last → unvollständiger Stream → Jetty `EOF in PREAMBLE` |
| `Content-Type: multipart/form-data` **ohne** `boundary=` | **bestätigt (gleiche Exception)** | Gezielter `curl` mit CT ohne Boundary reproduziert exakt `unexpected EOF in PREAMBLE`. Korrektes `-F …` (Boundary wird gesetzt) funktioniert |

Die App limitiert Uploads bereits selbst (`fileUploadLimit: 2GB` / Env `SYSTEMFILEUPLOADLIMIT`). Ein zweites Size-Limit per Traefik-Buffering ist unnötig und schädlich.

Verwandt (Upstream): Stirling Pipeline-Fix [#5522](https://github.com/Stirling-Tools/Stirling-PDF/pull/5522) — manuell gesetztes `Content-Type: multipart/form-data` ohne Boundary erzeugt denselben Jetty-Fehler; gilt für Clients, nicht für unsere IngressRoute.

### Abgrenzung DiskPressure

Separates Thema (Kapitel **Ephemeral Storage**): Kubelet-Eviction ohne `ephemeral-storage`-Request. Das war Pod-Kill, nicht Multipart-EOF. Beide Fixes gehören zum stabilen OCR-Betrieb, haben aber unterschiedliche Root Causes.

## Fix (GitOps)

In `apps/dev/stirling-pdf/ingressroute.yaml`:

1. **Buffering-Middleware entfernt** — kein `Middleware` mehr an der Route; Größenlimit nur in der App.
2. **`ServersTransport` `stirling-pdf`** mit `responseHeaderTimeout: 35m` (OCR/LibreOffice bis 30 min in `processExecutor`), plus sinnvolle `dialTimeout` / `idleConnTimeout`.

Commit-Referenz (minilab): `870f2f6` — *drop Traefik buffering that broke multipart OCR*.

## Soll-Zustand

```text
Browser/Client  --HTTPS/HTTP2-->  Traefik (websecure, stream)
                                      |
                                      v  HTTP/1.1, kein Body-Buffering
                                 Stirling :8080 (Jetty Multipart-Parse)
                                      |
                                      v
                                 OCRmyPDF / Tesseract
```

- Upload-Limit: ConfigMap / `SYSTEMFILEUPLOADLIMIT=2GB`
- Keine Traefik-`buffering`-Middleware auf Stirling
- Lange OCR: `responseHeaderTimeout: 35m`

## Verify

```bash
# 1) Kein Buffering mehr
kubectl -n stirling-pdf get middleware
# erwartet: kein stirling-pdf-upload

kubectl -n stirling-pdf get ingressroute stirling-pdf -o yaml | rg -n 'middleware|serversTransport|buffer'
kubectl -n stirling-pdf get serverstransport stirling-pdf -o yaml

# 2) UI: kleines PDF unter OCR — kein MultipartException
kubectl -n stirling-pdf logs deploy/stirling-pdf -c stirling-pdf --since=10m \
  | rg -i 'PREAMBLE|MultipartException|ocr-pdf' || true

# 3) Optional API (Key aus Settings → API Keys; nicht committen)
# curl -fsS --http2 -o /tmp/out.pdf -H "X-API-KEY: …" \
#   -F 'fileInput=@sample.pdf;type=application/pdf' \
#   -F 'languages=deu' -F 'ocrType=skip-text' -F 'ocrRenderType=hocr' \
#   https://stirling-pdf.stadthagen.dev/api/v1/misc/ocr-pdf
```

### Wenn PREAMBLE erneut auftaucht

1. Prüfen, ob wieder eine Buffering-/Compress-Middleware an der Route hängt.
2. Im Browser DevTools → Network am fehlgeschlagenen Request: enthält `Content-Type` ein `boundary=…`? Fehlt es, liegt der Fehler am Client (Extension, falscher API-Client), nicht an Traefik.
3. `Content-Length` vs. tatsächlich gesendete Bytes — Abbruch mitten im Upload sieht ähnlich aus.
4. Endpoint **`POST /api/v1/storage/files`** („Upload to server“ / My Files): bei Stirling **3.1.0** oft **Client-Bug**, nicht Traefik — siehe unten.

## „Upload to server“ → `/api/v1/storage/files` (2026-10-15)

Gleiche Jetty-Exception, **anderer Endpoint**. Live-Check nXk3:

| Hypothese | Ergebnis | Evidenz |
|--|--|--|
| Traefik Buffering wieder aktiv | **verworfen** | IngressRoute ohne Middlewares; `kubectl -n stirling-pdf get middleware` leer |
| Disk / ephemeral voll | **verworfen** | Pod Overlay ~50 % frei |
| Malformed CT ohne Boundary (generisch) | **möglich** | `curl` mit `Content-Type: multipart/form-data` ohne `boundary` → HTTP 400 + PREAMBLE; korrektes `-F` → 401 (Auth, Parse ok) |
| Leerer Multipart-Body vom UI („Upload to server“) | **bestätigt (Upstream)** | 16× Fehler in ~1,5 s auf `/api/v1/storage/files`; deckungsgleich mit [Stirling-PDF#8446](https://github.com/Stirling-Tools/Stirling-PDF/issues/8446) (3.1.0): Headers kommen an, Body vor erster Boundary leer — vor allem **iPadOS/iOS WebKit** (IndexedDB-Blob); Desktop oft ok |

**Workaround:** Upload von Desktop-Browser (Chrome/Firefox) testen; iOS/iPadOS meiden bis Upstream-Fix. Kein Infra-Change nötig, solange die IngressRoute ohne Buffering bleibt.

Gleiches Muster am **22:58** auf `POST /api/v1/general/merge-pdfs` (nicht nur Storage): Traefik-Pfad mit gültigem `curl -F fileInput=@…` → **401** (Auth, kein PREAMBLE). UI-Fehler = leerer/kaputter Multipart-Body vom Client (oft IndexedDB-Blob). Site-Daten für `stirling-pdf.stadthagen.dev` löschen oder Dateien frisch vom Dateisystem wählen; optional Image-Bump auf `3.2.0` (Release 2026-10-15) + Cache leeren.
