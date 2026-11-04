---
title: Betrieb
book_version: "1.3.0"
---

# Betrieb

## Rollout-Reihenfolge

1. **Authentik** — Redirects + Launch `vw-ext`, Custom-Email-Scope (`./scripts/reconcile.sh dev` / `--tags authentik-bootstrap`).
2. **Secrets** — `--tags secrets` → `vaultwarden-oauth` / `vaultwarden-admin` / `vaultwarden-smtp`.
3. **Chart/Manifest** — bei Values-Änderung lokal `helm template … --skip-tests > helm-manifest.yaml` committen ([Helm](05-helm-gitops.md)).
4. **Argo** — Apps `vaultwarden` + `pangolin-publish` synced/healthy.
5. **Clients** — Server-URL `https://vw-ext.stadthagen.dev`.

## Verify

- [ ] `https://vw-ext.stadthagen.dev` — Web-Vault lädt, OIDC-Login ok
- [ ] `https://vaultwarden.stadthagen.dev` → Redirect auf `vw-ext`
- [ ] Bitwarden-Client sync über `vw-ext`
- [ ] Admin `/admin` mit Token aus `vaultwarden-admin`
- [ ] SMTP: Test-Einladung oder Admin-Mail kommt an
- [ ] Emergency Access in der Web-UI konfigurierbar
- [ ] `kubectl -n vaultwarden get deploy,svc,ingressroute,networkpolicy,secret`
- [ ] Backup-CronJob Schedule `0 2,14 * * *`; letztes Successful Job optional prüfen
- [ ] Restore-UI `https://vw-restore.stadthagen.dev` (Authentik, `vaultwarden_admins`)
- [ ] PreSync Job `vw-restore-image-pull` Complete (bei ImagePull/503: [Incident 2026-11-04](12-incident-2026-11-04-imagepull-cascade.md))
- [ ] Pangolin-Status: keine Dual-Write-Warnung für `vw-ext`

```bash
kubectl -n vaultwarden get secret vaultwarden-oauth vaultwarden-admin vaultwarden-smtp
kubectl -n vaultwarden exec deploy/vaultwarden -- env | grep -E 'DOMAIN|SSO_|SMTP_|EMERGENCY_|ADMIN_'
```

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `SSO session binding mismatch` | Nur `vw-ext` nutzen; Cookies für beide Hosts löschen |
| `Failed to fetch` | UI muss auf `vw-ext` laufen (nicht LAN-HTML mit EXT-APIs) |
| `Cannot retrieve sso_auth` | Veralteter OIDC-Callback — frischen Login starten |
| Login abgelehnt | Gruppe + `email_verified`-Mapping |
| 502 über Pangolin | Newt, NetworkPolicy `newt`, Service Port 80 → Container 8080 |
| Admin-Panel | Token aus Secret `vaultwarden-admin`; URL `/admin` |
| Keine Mails / Emergency stumm | Secret `vaultwarden-smtp`, Port 465/`force_tls`, Relay erreichbar |
| Pod Crash nach Sync | PVC `vaultwarden-data` vorhanden? `existingClaim` in Values |

Logs:

```bash
kubectl -n vaultwarden logs deploy/vaultwarden --tail=100
```

Weiter: [SMTP & Emergency](09-smtp-emergency.md) · [Backup/Restore](08-backup-restore.md) · [Quellen](11-quellen.md).
