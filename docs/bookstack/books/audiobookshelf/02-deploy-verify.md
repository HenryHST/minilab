# Deploy & Verify

## Voraussetzungen

1. NFS-Pfade auf infra01: `…/audiobookshelf/{audiobooks,podcasts,metadata,config}` und `…/audiobookshelf-backups`.
2. SecretSpec `AUDIOBOOKSHELF_OAUTH_CLIENT_SECRET` + `AUDIOBOOKSHELF_ROOT_PASSWORD` → `--tags secrets` (Secrets `audiobookshelf-oauth`, `audiobookshelf-root`).
3. SecretSpec `AUTHENTIK_EMAIL_PASSWORD` (bereits für BookStack) → Secret `audiobookshelf-smtp` / `password`.
4. Terraform Authentik: `audiobookshelf_install_provider = true`, gepinntes Secret, Redirects callback + mobile-redirect + `/login`; Email-Scope mit `email_verified=true`.
5. Hetzner A `audiobookshelf` → Traefik LB `192.168.0.215`.
6. ApplicationSet `dev` / AppProject `dev` listen `audiobookshelf`.

## Sync

```bash
kubectl -n argocd get application audiobookshelf
kubectl -n audiobookshelf get pods,pvc,ingressroute,certificate,cronjob,job
kubectl -n audiobookshelf get secret audiobookshelf-oauth audiobookshelf-root audiobookshelf-smtp
```

## Checks

- TLS: `curl -ksI https://audiobookshelf.stadthagen.dev/`
- PostSync Jobs: `audiobookshelf-init` (Wave 5, Root) → `audiobookshelf-oidc` (Wave 6, OpenID) → `audiobookshelf-email` (Wave 7, SMTP)
- `/status` enthält `openid` in `authMethods`; Login-Button „Authentik“
- OIDC: Henry (`audiobookshelf_admins`), Marion (`audiobookshelf_users`); Local `root` bleibt Break-Glass
- E-Mail: Settings Host `mail.henrystadthagen.de`, Port `465`, From `auto@henrystadthagen.de`; Test-Mail in Abs-UI oder `POST /api/emails/test`
- Mounts `/audiobooks`, `/podcasts`, `/metadata`, `/config` beschreibbar
- Backup dry-run; Homepage-Kachel unter Tools