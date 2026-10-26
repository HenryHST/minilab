# Paperless-ngx

Document management with OCR (deu+eng, deskew/rotate on), Authentik OIDC, Gotenberg + Tika, HPScan NFS consume, shared Valkey (Redis protocol). PostSync seeds document types, tags, and workflow „Kategorie hinzufügen“.

| | |
|--|--|
| Argo | ApplicationSet `dev`, wave `3`, NS `paperless` |
| Images | `paperless-ngx:3.3.4`, `postgres:18`, `gotenberg:8.38.0`, `tika:4.1.0`, helpers `k8s-toolbox:1.0.1` |
| Valkey | `redis://redis.redis.svc.cluster.local:6379/0` (`apps/infra/redis`, `valkey/valkey:9.1.2-alpine`) |
| LAN | https://paperless.stadthagen.dev |
| Ext | https://paperless-ext.stadthagen.dev (pangolin-publish `enabled: false` until flipped) |
| OCR workers | Deployment `paperless-worker` + HPA 1–3 (pinned to `nxk3-w01` with web; hostPath media) |
| Storage | **Postgres:** CNPG `paperless-pg` (Longhorn). **App:** hostPath/local on `nxk3-w01` — `/var/lib/paperless-{data,media,export}` (`media-pvc.yaml`). **Consume:** HPScan NFS. **Backups (C):** `document_exporter` ZIP → NFS `…/infra01/paperless-backups` + CNPG snapshots |
| IMAP inbox | `paperless@stadthagen.dev` @ `mail.henrystadthagen.de:993` (Secret `paperless-imap`, PostSync `mail-inbox-job`) |
| OIDC groups | Access: `paperless_admins` / `paperless_users`. Document: `familie_stadthagen` / `familie_erdmann` / `vs-nfd` (PostSync `inbox-tag-job`; Authentik membership in Infra_LAB) |

## Secrets (before first sync)

```bash
# SecretSpec keys: PAPERLESS_OAUTH_CLIENT_SECRET, PAPERLESS_SECRET_KEY,
# PAPERLESS_DB_PASSWORD, PAPERLESS_ADMIN_PASSWORD (+ SMTP via AUTHENTIK_EMAIL_PASSWORD)
# IMAP inbox (separate mailbox password, not SMTP):
#   secretspec set PAPERLESS_IMAP_PASSWORD --profile cluster --provider cluster_age
ansible-playbook site.yaml --tags secrets
```

See `secret.example.yaml.txt`.

## Prerequisites

1. Host paths on `nxk3-w01` (uid/gid `1000`): Infra_LAB `ansible-playbook site.yaml --tags prereq --limit nxk3-w01` — or manual `mkdir`/`chown` for `/var/lib/paperless-{data,media,export}`. Details: BookStack **Paperless → Deploy & Verify**.
2. un10 HPScan NFS ACL includes k3s node IPs.
3. LAN DNS `paperless.stadthagen.dev` → `192.168.0.215`.
4. NFS dir `192.168.0.25:/var/nfs/shared/infra01/paperless-backups` exists.
5. Mailbox `paperless@stadthagen.dev` on `mail.henrystadthagen.de` + `PAPERLESS_IMAP_PASSWORD` set.

## Verify

```bash
kubectl -n argocd get application paperless redis
kubectl -n paperless get pods,hpa,ingressroute,pvc,job
kubectl -n redis exec deploy/redis -- valkey-cli ping
kubectl -n paperless get secret paperless-imap
kubectl -n paperless get pods -o wide | rg 'paperless-|paperless-worker'
```

OIDC login via LAN; drop a scan into HPScan → consume. IMAP: send a PDF to `paperless@stadthagen.dev` → Settings → Mail shows account/rule; document gets tag `inbox` (~10 min poll).

**Gotenberg / Tika smoke** (CronJob `paperless-gt-smoke`, every 6h): LibreOffice convert → PDF → Tika text extract; then system status (workloads, CNPG, PVC, health, backups), **Paperless API** (Secret `paperless-gt-smoke` / `api-token`), app **version** + image, and optional **Trivy** VulnerabilityReports (`TRIVY_REPORT=1` default). Report language: `REPORT_LANG=de|en` (default `de`). PDF mailed to `paperless@stadthagen.dev` (Subject `SMOKE=… SYS=… TRIVY=…`, optional `[FAIL-PDF]`). After bumping `gotenberg.yaml` / `tika.yaml` tags, run manually:

```bash
# Token: Paperless UI → Profile → Auth tokens → secret paperless-gt-smoke/api-token
kubectl -n paperless create job --from=cronjob/paperless-gt-smoke paperless-gt-smoke-manual-$(date +%s)
kubectl -n paperless logs -f job/paperless-gt-smoke-manual-…
# Expect: verdict SMOKE=PASS SYS=… TRIVY=… version=…; PDF generated; mail sent …
```

BookStack: **Paperless → Gotenberg & Tika Smoke**.

If pods stuck in `Init` with `FailedMount` / path does not exist: create the three host dirs on `nxk3-w01`, then delete the pods (see BookStack Deploy & Verify).

## Backup

CronJob `paperless-backup-cron` (05:00 UTC): `document_exporter -z` im Web-Pod → ZIP + `.meta` (Image-Tag) auf NFS `paperless-backups`, Retention 7. CNPG `paperless-pg-snapshot` alle 6h (DB-only). Manuell: `kubectl -n paperless create job --from=cronjob/paperless-backup-cron …`.

## Restore

ConfigMap `paperless-restore`: `enabled=true`, `archive=latest|<zip>`, `force=true` bei nicht-leerer Instanz → PostSync Job leert DB + data/media, startet Web, `document_importer`, skaliert Worker/HPA zurück. Danach sofort `enabled=false` in Git. **API-Tokens neu.** Pflicht-Checkliste V1–V14: BookStack **Paperless → Backup & Restore**.

ADR: [`docs/adr/0026-paperless-ngx.md`](../../docs/adr/0026-paperless-ngx.md) · [`0015-backup-restore-cronjobs.md`](../../docs/adr/0015-backup-restore-cronjobs.md).

## Trivy residuals (accepted until upstream)

Pin helpers to `git.stadthagen.dev/ops/k8s-toolbox:1.0.1`. Remaining **HIGH** on app images need newer upstream releases (do not custom-patch here):

- `paperless-ngx:3.3.4` — DRF ≥3.18.2, urllib3 ≥2.8.0, msgpack ≥1.2.1, setuptools ≥78.1.1
- `gotenberg:8.38.0` — Chromium ≥155.0.8059.79 (or 156.x); wait for next Gotenberg stable
- CNPG `18.6-202610190957` — newest dated bookworm tag at pin time
- `k8s-toolbox:1.0.1` still ships kubectl **v1.37.1** (same Go `stdlib`/`x/net` as 1.0.0); further Go hygiene = Forgejo kubectl bump, not a SemVer-only retarget
