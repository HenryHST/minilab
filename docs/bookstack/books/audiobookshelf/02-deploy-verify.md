# Deploy & Verify

## Voraussetzungen

1. NFS-Pfade auf infra01: `…/audiobookshelf/{audiobooks,podcasts,metadata,config}` und `…/audiobookshelf-backups`.
2. SecretSpec `AUDIOBOOKSHELF_OAUTH_CLIENT_SECRET` + `ansible-playbook site.yaml --tags secrets` (Secret `audiobookshelf-oauth`).
3. Terraform Authentik: `audiobookshelf_install_provider = true`, gepinntes `audiobookshelf_oauth_client_secret`, Gruppen Henry/Marion.
4. Hetzner A `audiobookshelf` → Traefik LB `192.168.0.215`.
5. ApplicationSet `dev` / AppProject `dev` listen `audiobookshelf`.

## Sync

```bash
kubectl -n argocd get application audiobookshelf
kubectl -n audiobookshelf get pods,pvc,ingressroute,certificate,cronjob
```

## Checks

- TLS: `curl -ksI https://audiobookshelf.stadthagen.dev/` (oder `--resolve …:443:192.168.0.215`)
- Erster Login als lokalem Abs-Admin → OpenID gegen Authentik konfigurieren (Issuer `…/application/o/audiobookshelf/`, Callback `/auth/openid/callback`)
- OIDC: Henry (`audiobookshelf_admins`), Marion (`audiobookshelf_users`)
- Mounts `/audiobooks`, `/podcasts`, `/metadata`, `/config` beschreibbar
- Backup dry-run: CronJob manuell anstoßen; Restore nur mit `audiobookshelf-restore` `enabled=true`
- Homepage-Kachel unter Tools
