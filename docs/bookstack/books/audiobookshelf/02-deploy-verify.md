# Deploy & Verify

## Voraussetzungen

1. NFS-Pfade auf infra01: `…/audiobookshelf/{audiobooks,podcasts,metadata,config}` und `…/audiobookshelf-backups`.
2. SecretSpec `AUDIOBOOKSHELF_OAUTH_CLIENT_SECRET` + `AUDIOBOOKSHELF_ROOT_PASSWORD` → `--tags secrets`.
3. Terraform Authentik: `audiobookshelf_install_provider = true`, gepinntes Secret, Redirects callback + mobile-redirect + `/login`.
4. Hetzner A `audiobookshelf` → Traefik LB `192.168.0.215`.
5. ApplicationSet `dev` / AppProject `dev` listen `audiobookshelf`.

## Sync

```bash
kubectl -n argocd get application audiobookshelf
kubectl -n audiobookshelf get pods,pvc,ingressroute,certificate,cronjob,job
```

## Checks

- TLS: `curl -ksI https://audiobookshelf.stadthagen.dev/`
- PostSync Jobs: `audiobookshelf-init` (Root) + `audiobookshelf-oidc` (OpenID via API)
- `/status` enthält `openid` in `authMethods`; Login-Button „Authentik“
- OIDC: Henry (`audiobookshelf_admins`), Marion (`audiobookshelf_users`); Local `root` bleibt Break-Glass
- Mounts `/audiobooks`, `/podcasts`, `/metadata`, `/config` beschreibbar
- Backup dry-run; Homepage-Kachel unter Tools
