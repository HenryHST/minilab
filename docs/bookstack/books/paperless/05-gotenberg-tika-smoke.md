---
title: Gotenberg & Tika Smoke
book_version: "1.6.1"
chapter_version: "1.4.0"
updated: "2026-10-24"
---

# Gotenberg & Tika Smoke

> **Buch** v1.6.1 · **Kapitel** v1.4.0 · Stand: 2026-10-24

Funktionaler Smoke für die Office→PDF→Text-Kette plus bewerteter Paperless-Systemstatus (Backups, REST-API, App-Version) und optional Trivy. Der PDF-Bericht zeigt Verdict-Karten — auf einen Blick: Smoke, System, Trivy.

## Überblick

| Element | Wert |
|---------|------|
| CronJob | `paperless-gt-smoke` (NS `paperless`) |
| Schedule | `0 */6 * * *` (UTC), Forbid |
| ServiceAccount | `paperless-gt-smoke` (get/list Pods, Deploy, HPA, PVC, CronJob/Job, CNPG, VulnerabilityReports) |
| Image | `git.stadthagen.dev/ops/k8s-toolbox:1.0.1` (amd64 `nodeSelector`) |
| Gotenberg | LibreOffice convert + Chromium HTML→PDF |
| Manifest | minilab `apps/dev/paperless/gotenberg-tika-smoke.yaml` |
| API-Token | Secret `paperless-gt-smoke` / Key `api-token` (manuell; UI Profil → Auth-Tokens) |
| Sprache | Env `REPORT_LANG=de\|en` (Default **`de`**) |
| Trivy | Env `TRIVY_REPORT=1\|0` (Default **`1`**) |
| Report-Mail | An `paperless@stadthagen.dev`; From/SMTP `auto@henrystadthagen.de` |
| Betreff | `[paperless-gt-smoke] SMOKE=… SYS=… TRIVY=…` (optional `[FAIL-PDF]`) |
| Anhang | PDF A4: Seite 1 Verdicts + Checklisten; **eigene Seite** Trivy; **eigene Seite** Rohlog |

Job-Exit: nur Smoke FAIL → Job Failed. System-/Trivy-DEGRADED/FAIL erscheinen im Bericht, killen den Job nicht.

Welche Findings nach Image-Bump noch **akzeptiert** sind (Paperless/Gotenberg Upstream, kubectl in toolbox): [Trivy & CVE-Hygiene](06-trivy-cve-hygiene.md).

![Paperless Gotenberg/Tika Smoke Architektur](../../../diagrams/seecode/exports/paperless-gt-smoke.png)

Interaktiv: [`paperless-gt-smoke.html`](../../../diagrams/seecode/paperless-gt-smoke.html)

## Verdicts

| Karte | Werte | Bedeutung |
|-------|--------|-----------|
| **Smoke** | PASS / FAIL | LibreOffice→PDF→Tika-Marker |
| **System** | OK / DEGRADED / FAIL | Deployments, CNPG, PVC, Health, Backups, **API** |
| **Trivy** | OK / DEGRADED / FAIL | VulnerabilityReports im NS (nur wenn `TRIVY_REPORT=1`) |

Meta-Zeile im PDF: **Paperless-Version** (`X-Version` / `ui_settings`) und Deployment-**Image**-Tag.

### System FAIL (Auszug)

- Deployment mit 0 ready/available; CNPG nicht healthy; PVC nicht Bound
- Health Gotenberg/Tika ≠ 200 bzw. Paperless nicht 2xx/3xx
- API-Token fehlt / 401 / Endpoints nicht 2xx
- Letzter App-Backup-Job `Failed`; letzter CNPG-`Backup` phase `failed`

### System DEGRADED (Auszug)

- Deployment ready &lt; desired (HPA-Scale / Rolling)
- CrashLoop/ImagePull an App-Pods; CronJob suspended
- App-Backup (`paperless-backup-cron`): kein Erfolg in **36h**
- CNPG-Snapshot (`paperless-pg-snapshot`): kein completed Backup in **12h** / ScheduledBackup fehlt

### Trivy

| Status | Bedingung |
|--------|-----------|
| FAIL | mindestens ein CRITICAL, oder Collect-Fehler ohne Reports |
| DEGRADED | kein CRITICAL, aber HIGH &gt; 0 |
| OK | keine CRITICAL/HIGH (oder keine Reports) |

`TRIVY_REPORT=0`: Karte und Abschnitt entfallen; Betreff ohne `TRIVY=`.

## API-Token anlegen

1. Paperless UI → Profil → **Auth tokens** → Token erzeugen
2. Secret (nicht Ansible):

```bash
kubectl -n paperless create secret generic paperless-gt-smoke \
  --from-literal=api-token='YOUR_TOKEN' \
  --dry-run=client -o yaml | kubectl apply -f -
```

Beispiel: `apps/dev/paperless/secret.example.yaml.txt` (Block `paperless-gt-smoke`).

## Sprache umschalten

CronJob-Env `REPORT_LANG`:

- `de` — Standard (deutsche Labels/Mail)
- `en` — englischer Bericht

## Ablauf

1. Smoke: Health → DOCX-Fixture → LibreOffice-PDF → Tika-Marker
2. Status: kubectl JSON + Health + **API** (`/api/`, documents, tags, Version) + optional **Trivy**
3. Bewertung → HTML (`REPORT_LANG`) → Chromium-PDF → Mail

![Gotenberg/Tika Smoke Ablauf](../../../diagrams/seecode/exports/paperless-gt-smoke-flow.png)

Interaktiv: [`paperless-gt-smoke-flow.html`](../../../diagrams/seecode/paperless-gt-smoke-flow.html)

## Nach Image-Bump

```bash
# Secret paperless-gt-smoke/api-token muss existieren
kubectl apply -f apps/dev/paperless/gotenberg-tika-smoke.yaml
kubectl -n paperless create job --from=cronjob/paperless-gt-smoke "paperless-gt-smoke-manual-$(date +%s)"
kubectl -n paperless logs -f job/paperless-gt-smoke-manual-…
# Erwartung: verdict SMOKE=PASS SYS=… TRIVY=… version=…; PDF generated; mail … TRIVY=…
```

## Siehe auch

- App-README: `apps/dev/paperless/README.md` (Verify)
- Deploy & Verify: [02-deploy-verify.md](02-deploy-verify.md)
- Trivy Operator: Buch **Trivy Operator**
- ADR-0026 Paperless-ngx
