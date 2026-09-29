# Übersicht

Audiobookshelf hostet Hörbücher und Podcasts auf nXk3 (LAN-only) mit Authentik-OIDC und NFS-Storage.

```mermaid
flowchart LR
  User[LAN_User] --> Traefik
  Traefik -->|"TLS audiobookshelf-tls"| Svc[Service]
  Svc --> Pod[audiobookshelf]
  NFSLib[NFS_audiobookshelf] --> Pod
  Pod -->|"OIDC"| IdP[Authentik]
  Pod -->|"SMTP"| Mail[mail_henrystadthagen_de]
  Pod -->|"daily_tar"| NFSBak[NFS_audiobookshelf_backups]
```

| | |
|--|--|
| Argo App | `audiobookshelf` (ApplicationSet `dev`, Wave 3) |
| Namespace | `audiobookshelf` |
| LAN | https://audiobookshelf.stadthagen.dev |
| Ext | — (v1 LAN-only) |
| DNS | Hetzner A `audiobookshelf` → `192.168.0.215` |
| Auth | Authentik OIDC (PostSync Job Wave 6) |
| E-Mail | BookStack-SMTP `mail.henrystadthagen.de:465` (PostSync Job Wave 7) |

ADR: [0027-audiobookshelf](../../../adr/0027-audiobookshelf.md).
