---
title: Betrieb
book_version: "1.1.1"
---

# Betrieb

## Rollout-Reihenfolge

1. **Authentik** — Redirects + Launch `vw-ext`, Custom-Email-Scope (`./scripts/reconcile.sh dev` / `--tags authentik-bootstrap`).
2. **Secrets** — `--tags secrets` → `vaultwarden-oauth` / `vaultwarden-admin`.
3. **Argo** — Apps `vaultwarden` + `pangolin-publish` synced/healthy.
4. **Clients** — Server-URL `https://vw-ext.stadthagen.dev`.

## Verify

- [ ] `https://vw-ext.stadthagen.dev` — Web-Vault lädt, OIDC-Login ok
- [ ] `https://vaultwarden.stadthagen.dev` → Redirect auf `vw-ext`
- [ ] Bitwarden-Client sync über `vw-ext`
- [ ] `kubectl -n vaultwarden get deploy,ingressroute,networkpolicy`
- [ ] Backup-CronJob Schedule `0 2,14 * * *`; Argo Create Job / letztes Successful Job optional prüfen
- [ ] Restore-UI `https://vw-restore.stadthagen.dev` (Authentik, `vaultwarden_admins`)
- [ ] Pangolin-Status: keine Dual-Write-Warnung für `vw-ext`

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `SSO session binding mismatch` | Nur `vw-ext` nutzen; Cookies für beide Hosts löschen |
| `Failed to fetch` | UI muss auf `vw-ext` laufen (nicht LAN-HTML mit EXT-APIs) |
| `Cannot retrieve sso_auth` | Veralteter OIDC-Callback — frischen Login starten |
| Login abgelehnt | Gruppe + `email_verified`-Mapping |
| 502 über Pangolin | Newt, NetworkPolicy `newt`, Service Port 80 |
| Admin-Panel | Token aus Secret `vaultwarden-admin`; URL laut Vaultwarden-Doku `/admin` |

Logs:

```bash
kubectl -n vaultwarden logs deploy/vaultwarden --tail=100
```
