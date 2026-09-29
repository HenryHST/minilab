# Audiobookshelf

Hörbuch-/Podcast-Server auf nXk3 (LAN). Issue [HenryHST/minilab#86](https://github.com/HenryHST/minilab/issues/86).

| | |
|--|--|
| URL | https://audiobookshelf.stadthagen.dev |
| Namespace | `audiobookshelf` |
| Image | `ghcr.io/advplyr/audiobookshelf:2.37.0` |
| Auth | Authentik OIDC (slug `audiobookshelf`) |
| DNS | Hetzner A `audiobookshelf` → Traefik LB `192.168.0.215` |

## Storage (NFS `192.168.0.25`)

| Share path | Mount |
|------------|-------|
| `/var/nfs/shared/infra01/audiobookshelf/audiobooks` | `/audiobooks` |
| `…/podcasts` | `/podcasts` |
| `…/metadata` | `/metadata` |
| `…/config` | `/config` |
| `…/audiobookshelf-backups` | CronJob backup target |

**Backup** sichert nur `/config` (Settings/DB). Libraries bleiben auf NFS und werden nicht täglich tar’t.

## Secrets

```bash
# ansible/playbooks/k3s_cluster/
secretspec set AUDIOBOOKSHELF_OAUTH_CLIENT_SECRET   # same value as terraform audiobookshelf_oauth_client_secret
secretspec set AUDIOBOOKSHELF_ROOT_PASSWORD         # openssl rand -base64 32 — PostSync POST /init
# AUTHENTIK_EMAIL_PASSWORD already set — also maps to audiobookshelf-smtp
ansible-playbook site.yaml --tags secrets -i inventory/cluster/hosts.yaml
```

Creates Secrets `audiobookshelf-oauth` (`client-secret`), `audiobookshelf-root` (`username`/`password`), and `audiobookshelf-smtp` (`password` ← `AUTHENTIK_EMAIL_PASSWORD`).

## Initial setup

PostSync Job `audiobookshelf-init` calls Abs `POST /init` when `/status` has `isInit=false` (paths stay `/config` + `/metadata`). Skip if Secret fehlt oder Server schon initialisiert. Kein Env-Bootstrap in Image `2.37.0` (`INIT_USER_*` erst upstream neuer).

## OIDC

PostSync Job `audiobookshelf-oidc` (Wave 6) konfiguriert OpenID per `PATCH /api/auth-settings` nach Root-Login:

- Issuer Discovery: `https://idp.stadthagen.dev/application/o/audiobookshelf/`
- Client ID `audiobookshelf`, Secret aus `audiobookshelf-oauth`
- Methoden: `local` + `openid` (Local = Break-Glass)
- Auto-register, Match by email, Button „Authentik“; Group Claim leer (Abs erwartet `admin`/`user`/`guest`, nicht Authentik-Gruppennamen)
- `authOpenIDSubfolderForRedirectURLs` muss `""` sein (sonst sendet Abs `…/undefined/auth/openid/callback` → Authentik redirect_uri mismatch)
- Bei Änderung: `rollout restart` Deployment

Authentik Redirects: `/auth/openid/callback`, `/auth/openid/mobile-redirect`, `/login`.

Zugang: Authentik-Gruppen `audiobookshelf_admins` (Henry) / `audiobookshelf_users` (Marion) steuern IdP-Zugang; Abs-Admin-Rechte ggf. einmalig in der Abs-UI setzen. Authentik-Scope „Audiobookshelf Email Scope“ setzt `email_verified=true` (Abs Match-by-email / Auto-register).

## E-Mail (SMTP)

PostSync Job `audiobookshelf-email` (Wave 7) setzt SMTP per `PATCH /api/emails/settings` (kein `MAIL_*`-Env in Abs). Gleiche Werte wie BookStack:

| Feld | Wert |
|------|------|
| Host | `mail.henrystadthagen.de` |
| Port | `465` (secure / SSL) |
| User / From | `auto@henrystadthagen.de` |
| Passwort | Secret `audiobookshelf-smtp` ← SecretSpec `AUTHENTIK_EMAIL_PASSWORD` |

Skip wenn Root- oder SMTP-Secret fehlt. Verify: Abs Settings → E-Mail → Test-Mail, oder `POST /api/emails/test`.

## Backup / Restore

- Cron: `audiobookshelf-backup-cron` (03:00 UTC), Retention 7
- Restore: ConfigMap `audiobookshelf-restore` → `enabled: "true"` (+ optional `force`), Argo Sync, danach sofort `enabled: "false"`

## Docs

- ADR-0027, BookStack-Buch `docs/bookstack/books/audiobookshelf/`
- Upstream: https://audiobookshelf.org/docs/category/installation
