# Deploy & Verify

## Voraussetzungen

1. SecretSpec + `ansible-playbook site.yaml --tags secrets` (Paperless-Secrets inkl. optional `PAPERLESS_IMAP_PASSWORD`).
2. Terraform Authentik: `paperless_oauth_client_secret` + `paperless_external_url` gepinnt.
3. un10 HPScan NFS-ACL für k3s-Nodes.
4. LAN-DNS `paperless.stadthagen.dev` → `192.168.0.215`.
5. NFS-Backup-Pfad `…/infra01/paperless-backups` angelegt.
6. Mailbox `paperless@stadthagen.dev` auf `mail.henrystadthagen.de` (IMAP).

## Sync

```bash
kubectl -n argocd get application redis paperless
kubectl -n paperless get pods,hpa,pvc,job
kubectl -n redis exec deploy/redis -- redis-cli ping
```

## Checks

- OIDC-Login über LAN
- Scan in HPScan → erscheint unter Consume / Inbox-Tag
- IMAP: PDF an `paperless@stadthagen.dev` → Settings → Mail; Dokument mit Tag `inbox`
- Ext absichtlich nicht erreichbar, bis `pangolin-publish` `paperless.enabled=true`
