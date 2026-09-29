# Deploy & Verify

## Voraussetzungen

1. NFS-Pfad `192.168.0.25:/var/nfs/shared/infra01/n8n-backups` anlegen.
2. SecretSpec `N8N_ENCRYPTION_KEY` + `N8N_DB_PASSWORD` → `--tags secrets` (Secrets `n8n-app`, `n8n-db`, `n8n-smtp`).
3. Day-0 Blueprint `day0-n8n` synced (Service `ak-outpost-n8n`); Terraform-Gruppen `n8n_admins` / `n8n_users`.
4. Manueller Hetzner A `n8n` → `192.168.0.215`.
5. ApplicationSet/AppProject `dev` listen `n8n`.

## Sync

```bash
kubectl -n argocd get application n8n
kubectl -n n8n get pods,sts,ingressroute,middleware,certificate,cronjob
kubectl -n authentik get svc ak-outpost-n8n
```

## Checks

1. `https://n8n.stadthagen.dev` → Authentik-Login → n8n UI (danach lokaler Owner-Login).
2. User ohne `n8n_*`-Gruppe → Deny.
3. `/webhook*` ohne Session erreichbar (kein Redirect zu idp).
4. Test-Mail aus n8n-Settings; Backup-Job dry-run.
5. Authentik Library zeigt n8n-Logo (dashboard-icons SVG).
