# Migration von Uptime Kuma

Kuma-Monitore und die SQLite-Datei werden nicht übernommen. Vor dem Umschalten einmal sichern, solange der Namespace `uptimekuma` noch existiert:

```bash
kubectl -n uptimekuma create job --from=cronjob/kuma-backup-cron kuma-backup-manual
```

## Reihenfolge

1. NAS-Ordner: `mkdir -p /var/nfs/shared/infra01/gatus-backups`
2. SecretSpec setzen (Infra_LAB), dann `ansible-playbook site.yaml --tags secrets`:
   - `GATUS_DB_PASSWORD` (`openssl rand -hex 24`)
   - `GATUS_OAUTH_CLIENT_SECRET` (`openssl rand -base64 32`), derselbe Wert als `gatus_oauth_client_secret` in `dev.secrets.tfvars`
   - `GATUS_PUSHOVER_APP_TOKEN` (eigene Pushover-Application)
   - `PUSHOVER_USER_KEY` bleibt der bestehende User-Key
3. Authentik dev: `cd terraform/authentik && ./scripts/reconcile.sh dev`  
   Damit fällt Application `uptime_kuma` weg und `gatus` entsteht. Henry liegt in `gatus_admins`. Prod-IdP behält Uptime Kuma.
4. Git-Stand mit der Argo-App `gatus` syncen. Argo entfernt `uptimekuma` und legt `status` an. TLS fehlt kurz, bis cert-manager `status.stadthagen.dev` neu ausstellt.
5. Prüfen: Login als Henry, vier Endpunkte grün, `/metrics` in Prometheus, Pushover-Test, einmal `gatus-backup-manual`.

## Endpunkte

Intervall 1 Minute, Bedingung `[STATUS] == 200`:

| Name | URL |
|------|-----|
| authentik | https://idp.stadthagen.dev |
| it-tools | https://it-tools.stadthagen.dev |
| paperless | https://paperless.stadthagen.dev |
| bookstack | https://book.stadthagen.dev |
