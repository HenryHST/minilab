# Deploy & Verify

## Voraussetzungen

1. SecretSpec + `ansible-playbook site.yaml --tags secrets` (Paperless-Secrets).
2. Terraform Authentik: `paperless_oauth_client_secret` + `paperless_external_url` gepinnt.
3. un10 HPScan NFS-ACL für k3s-Nodes.
4. LAN-DNS `paperless.stadthagen.dev` → `192.168.0.215`.
5. NFS-Backup-Pfad `…/infra01/paperless-backups` angelegt.

## Sync

```bash
kubectl -n argocd get application redis paperless
kubectl -n paperless get pods,hpa,pvc
kubectl -n redis exec deploy/redis -- redis-cli ping
```

## Checks

- OIDC-Login über LAN
- Scan in HPScan → erscheint unter Consume / Inbox-Tag
- Ext absichtlich nicht erreichbar, bis `pangolin-publish` `paperless.enabled=true`
