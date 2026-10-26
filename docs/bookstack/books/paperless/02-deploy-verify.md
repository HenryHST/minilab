---
title: Deploy & Verify
book_version: "1.10.0"
---

# Deploy & Verify

> **Buch** v1.10.0 · Stand: 2026-10-26

## Voraussetzungen

1. Worker `nxk3-w01` erreichbar — Hostname im Cluster exakt `nxk3-w01` (wie in `media-pvc.yaml` NodeAffinity).
2. Host-Verzeichnisse für data/media/export vorhanden (bevorzugt Ansible, siehe [Local Storage](#local-storage-nxk3-w01)) — ohne sie bleiben Pods in `Init` / `FailedMount`.
3. SecretSpec + `ansible-playbook site.yaml --tags secrets` (Paperless-Secrets inkl. optional `PAPERLESS_IMAP_PASSWORD`).
4. Terraform Authentik: `paperless_oauth_client_secret` + `paperless_external_url` gepinnt.
5. un10 HPScan NFS-ACL für k3s-Nodes.
6. LAN-DNS `paperless.stadthagen.dev` → `192.168.0.215`.
7. NFS-Backup-Pfad `…/infra01/paperless-backups` angelegt.
8. Mailbox `paperless@stadthagen.dev` auf `mail.henrystadthagen.de` (IMAP).

## Local Storage (nxk3-w01)

App-Daten liegen auf **lokalen** PVs (nicht Longhorn). Manifest: `apps/dev/paperless/media-pvc.yaml` (`local.path` + `nodeAffinity` → `nxk3-w01`). StorageClass: `manual-paperless`.

| PVC | PV | Host-Pfad | Größe (Claim) |
|-----|-----|-----------|----------------|
| `paperless-data` | `paperless-data-host` | `/var/lib/paperless-data` | 5Gi |
| `paperless-media` | `paperless-media-host` | `/var/lib/paperless-media` | 50Gi |
| `paperless-export` | `paperless-export-host` | `/var/lib/paperless-export` | 10Gi |

Deployments nutzen `fsGroup: 1000` — Verzeichnisse mit Owner/Group `1000` anlegen.

**Postgres** liegt **nicht** auf hostPath: CNPG Cluster `paperless-pg` auf Longhorn (siehe unten). Legacy `/var/lib/paperless-postgres` auf `nxk3-w01` bleibt nur als Rollback-Pfad.

### Verzeichnisse anlegen

*Empfohlen (Infra_LAB Ansible):*

```bash
cd ansible/playbooks/k3s_cluster
ansible-playbook site.yaml --tags prereq --limit nxk3-w01
# oder: ansible-playbook prepare-nodes.yaml --limit nxk3-w01
```

Erwartung auf dem Node: die drei Pfade existieren (`ls -la /var/lib/paperless-*`).

*Manuell (Notfall / ohne Ansible-Lauf):*

```bash
ssh pi@192.168.0.44   # nxk3-w01 (Cloud-Init-User aus terraform/proxmox_k3s)
sudo mkdir -p /var/lib/paperless-data /var/lib/paperless-media /var/lib/paperless-export
sudo chown 1000:1000 /var/lib/paperless-data /var/lib/paperless-media /var/lib/paperless-export
sudo chmod 755 /var/lib/paperless-data /var/lib/paperless-media /var/lib/paperless-export
```

Danach ggf. hängende Pods löschen, damit der Kubelet neu mountet:

```bash
kubectl -n paperless delete pod -l app=paperless
kubectl -n paperless delete pod -l app=paperless-worker
```

## Sync

```bash
kubectl -n argocd get application redis paperless
kubectl -n paperless get pods,hpa,pvc,job
kubectl -n redis exec deploy/redis -- valkey-cli ping
```

### Storage-Check

```bash
kubectl -n paperless get pvc,pv | rg paperless
# Pods müssen auf nxk3-w01 laufen (data/media/export)
kubectl -n paperless get pods -o wide | rg 'paperless-|paperless-worker'
```

## Postgres (CloudNativePG)

Cluster `paperless-pg` (1 Instanz, Longhorn 8Gi, Image `ghcr.io/cloudnative-pg/postgresql:18`). App und Worker: `PAPERLESS_DBHOST=paperless-pg-rw`, `PAPERLESS_DBSSLMODE=require`. Server-TLS kommt von cert-manager (`cnpg-certificates.yaml`); Client-Zertifikate bleiben beim Operator.

Der einmalige Import vom StatefulSet `paperless-postgres` ist erledigt und aus dem Spec entfernt. Service und StatefulSet sind aus Git weg. hostPath `/var/lib/paperless-postgres` auf `nxk3-w01` bleibt als Rollback.

```bash
kubectl -n paperless get cluster paperless-pg
kubectl -n paperless get scheduledbackup paperless-pg-snapshot
```

Erwartung: Cluster `healthy`, 1 Instanz. `pg_dump` des CronJobs geht gegen `paperless-pg-rw` mit `PGSSLMODE=require`.

## Dateinamen / Filename-Format

Web- und Worker-Deployment setzen:

```yaml
- name: PAPERLESS_FILENAME_FORMAT
  value: "{{created_year}}_{{correspondent}}_{{title}}"
```

Neue Consumes und Speichervorgänge legen Media-Dateien unter diesem Schema ab (Jahr_Korrespondent_Titel).

**Bestehende Dateien** übernimmt Paperless nicht automatisch. Nach einem Format-Wechsel (oder wenn Metadaten nachgezogen wurden) einmalig den Renamer im Web-Pod ausführen:

```bash
kubectl -n paperless exec deploy/paperless -c paperless -- \
  python3 manage.py document_renamer
```

Kein dauerhafter PostSync-Job — nur bei Bedarf. Fehlende Correspondent-/Title-Metadaten ergeben leere Segmente im Dateinamen; Metadaten setzen und Renamer erneut laufen lassen.

## OCR / Schräglagenkorrektur

Web- und Worker-Deployment setzen explizit die Upstream-Defaults:

| Env | Wert | Wirkung |
|-----|------|---------|
| `PAPERLESS_OCR_DESKEW` | `true` | leichte Schräglage korrigieren |
| `PAPERLESS_OCR_ROTATE_PAGES` | `true` | 90°/180°/270° drehen |

Gilt für **neue** Consumes. Bei `PAPERLESS_OCR_MODE=redo` deaktiviert Paperless Deskew automatisch — Mode bleibt bei uns `auto` (Default). Upstream: [OCR settings](https://docs.paperless-ngx.com/configuration/#PAPERLESS_OCR_DESKEW).

Die UI-Schalter liegen in `ApplicationConfiguration` (DB). `null` erscheint in der UI als **aus**, auch wenn Env-Defaults zur Laufzeit greifen. PostSync setzt deshalb `deskew`/`rotate_pages` explizit auf `true`.

```bash
kubectl -n paperless exec deploy/paperless -c paperless -- env | rg 'OCR_DESKEW|OCR_ROTATE'
kubectl -n paperless logs job/paperless-inbox-tag | rg 'ocr config'
```

## Dokumententypen, Tags & Workflow (PostSync)

Job `paperless-inbox-tag` (Wave 5) legt idempotent an:

- Inbox-Tag `inbox` (`is_inbox_tag`) + OIDC-/Dokumentgruppen (siehe [OIDC-Gruppen](04-oidc-gruppen.md))
- **Dokumententypen:** AGBs / Vertragsbedingungen, Antrag, Attest, AU, Bedienungsanleitung, Bescheid, Bestellung, Bewerbung, Datenschutz, Dokumente, Gehaltsnachweis, Kontoauszug, Lieferschein, Mahnung, Rechnung, Schaden, Sonstiges, Vertrag, Wichtig, Zahlungserinnerung, Zeugnisse
- **Tags:** Bausparer, BAV (Betriebliche Altersvorsorge), Bilder, Brille, Elektronik, Festnetz, Fortbildung, Haftpflicht, Handy, Hausrat, Heizung, Job-Rad, KFZ, Krankenzusatz, Müll, Nebenkosten, PV, Rechtsschutz, Rente, Risikoleben, Schaden, Service, Sozialversicherung, Strom, Unfall, Wasser, Wohngebäude, Wohnung
- **Custom Field** `Kategorie` (neu als `string`, bestehendes Feld unverändert)
- **Arbeitsablauf** `Kategorie hinzufügen` (`order=1`, aktiv): Auslöser *Verarbeitung gestartet* (`CONSUMPTION`), Aktion *Zuordnung* mit benutzerdefiniertem Feld `Kategorie` (ohne festen Wert)

Manifest: `apps/dev/paperless/inbox-tag-job.yaml`. Kein Auto-Matching — Zuordnung manuell bzw. über den Workflow nur das leere Feld.

```bash
kubectl -n paperless logs job/paperless-inbox-tag | rg 'documenttype|tag |Kategorie|workflow'
```

## Checks

- OIDC-Login über LAN
- Scan in HPScan → erscheint unter Consume / Inbox-Tag
- IMAP: PDF an `paperless@stadthagen.dev` → Settings → Mail; Dokument mit Tag `inbox`
- Ext absichtlich nicht erreichbar, bis `pangolin-publish` `paperless.enabled=true`
- Storage: PVCs Bound, Web/Worker Ready auf `nxk3-w01`, keine `FailedMount`-Events
- Filename-Format: Env `PAPERLESS_FILENAME_FORMAT` in Web + Worker; nach Format-Wechsel `document_renamer` (siehe oben)
- OCR: `PAPERLESS_OCR_DESKEW` / `OCR_ROTATE_PAGES` = `true` in Web + Worker
- Seed: Dokumententypen/Tags/Workflow `Kategorie hinzufügen` nach PostSync sichtbar (UI Einstellungen)
- Gotenberg/Tika: CronJob `paperless-gt-smoke` (alle 6h) oder manuell nach Image-Bump — siehe [Gotenberg & Tika Smoke](05-gotenberg-tika-smoke.md)
- Trivy/CVE-Pins und akzeptierte Residuals: [Trivy & CVE-Hygiene](06-trivy-cve-hygiene.md) (Helper `k8s-toolbox:1.0.1`)

## Troubleshooting: FailedMount / path does not exist

**Symptom:** Argo App `paperless` Degraded; Pods `Init:0/…` oder Pending; Events:

`MountVolume.NewMounter initialization failed for volume "paperless-*-host" : path "/var/lib/paperless-…" does not exist`.

**Ursache:** Node neu provisioniert oder Disk geleert — `local` PVs verlangen, dass der Pfad **auf dem Node schon existiert**. Kubernetes legt ihn nicht an.

**Diagnose:**

```bash
kubectl -n paperless get pods -o wide
kubectl -n paperless describe pod -l app=paperless | rg -A2 FailedMount
ssh pi@192.168.0.44 'ls -la /var/lib/paperless-*'
```

**Fix:** Ansible `prereq` oder manuelles `mkdir`/`chown` (siehe oben), dann Pods neu starten; prüfen bis Ready und `kubectl -n argocd get application paperless` → Healthy.

**Hinweis:** Bei Host-Key-Wechsel nach VM-Rebuild (`REMOTE HOST IDENTIFICATION HAS CHANGED`) zuerst `ssh-keygen -R 192.168.0.44`, dann erneut SSH.
