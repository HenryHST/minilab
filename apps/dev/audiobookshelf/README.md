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
ansible-playbook site.yaml --tags secrets -i inventory/cluster/hosts.yaml
```

Creates Secret `audiobookshelf/audiobookshelf-oauth` (`client-secret`).

## OIDC (first boot)

Abs speichert OpenID in `/config` (kein Env). Nach erstem Login als Root-Admin:

1. Settings → Authentication → OpenID
2. Issuer: `https://idp.stadthagen.dev/application/o/audiobookshelf/` (auto-populate)
3. Client ID: `audiobookshelf`
4. Client Secret: aus Secret / SecretSpec
5. Button text: Authentik; Auto-register; Match existing by email; Group claim: `groups`
6. Redirect URI in Authentik: `https://audiobookshelf.stadthagen.dev/auth/openid/callback`

Zugang: Authentik-Gruppen `audiobookshelf_admins` (Henry) / `audiobookshelf_users` (Marion). Abs-Admin-Rechte ggf. einmalig in Abs UI setzen.

## Backup / Restore

- Cron: `audiobookshelf-backup-cron` (03:00 UTC), Retention 7
- Restore: ConfigMap `audiobookshelf-restore` → `enabled: "true"` (+ optional `force`), Argo Sync, danach sofort `enabled: "false"`

## Docs

- ADR-0027, BookStack-Buch `docs/bookstack/books/audiobookshelf/`
- Upstream: https://audiobookshelf.org/docs/category/installation
