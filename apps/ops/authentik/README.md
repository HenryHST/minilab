# Authentik (nXk3 IdP)

GitOps install for `idp.stadthagen.dev`. Day-0 blueprints: [BLUEPRINTS.md](BLUEPRINTS.md).

## Brand media (logos / background)

NFS source: `192.168.0.25:/var/nfs/shared/infra01/media/public/branding/` → PVC `authentik-media` at `/media/public/branding/`.

- **PostSync Job** `authentik-media-sync-bootstrap` — runs once after each successful Argo sync (so Day-0 is not empty until the CronJob fires).
- **CronJob** `authentik-media-sync` — every 6h thereafter.

Manual: `kubectl -n authentik create job --from=cronjob/authentik-media-sync media-sync-manual`

Brand paths in Infra_LAB Terraform: `branding/{favicon,key_transparent,website-work}.*` (served as `/files/media/public/branding/...?token=`).

**Note:** Branding sync ≠ full backup. Daily NFS backup (below) also covers uploads/icons on the media PVC; secrets stay in SecretSpec only.

## Backup / Restore

- NAS: `mkdir -p /var/nfs/shared/infra01/authentik-backups`
- CronJob `authentik-backup-cron` (05:00 UTC): `pg_dump` (DB/User `authentik`) + tar `/media` → combined `authentik-*.tar.gz` (Retention 7)
- Manuell: `kubectl -n authentik create job --from=cronjob/authentik-backup-cron authentik-backup-manual`
- Bootstrap-Restore: ConfigMap `authentik-restore` → `enabled=true` (bei vorhandener DB/Media zusätzlich `force=true`), Argo Sync (skaliert server+worker auf 0, stellt DB + Media wieder her); danach sofort `enabled=false` committen

Siehe [ADR-0015](../../docs/adr/0015-backup-restore-cronjobs.md).

## Helm (vendored + rendered)

Avoids Argo CD `kustomize --enable-helm` / `helm pull` races (`charts/... already exists`).

```bash
# bump chart version, then:
helm pull authentik --repo https://charts.goauthentik.io --version 2026.8.3 --untar --untardir charts
helm dependency update charts/authentik
helm template authentik ./charts/authentik \
  -f values.yaml --namespace authentik --include-crds \
  > helm-manifest.yaml
```

IdP config (OAuth/LDAP/Brand) stays in Infra_LAB OpenTofu / `--tags authentik-bootstrap`.

## Bootstrap-Admin (Anmelde-Passwort)

```bash
cd ansible/playbooks/k3s_cluster/secrets   # Infra_LAB
secretspec get AUTHENTIK_BOOTSTRAP_PASSWORD --profile cluster
secretspec get AUTHENTIK_BOOTSTRAP_EMAIL --profile cluster

kubectl -n authentik get secret authentik-credentials \
  -o jsonpath='{.data.AUTHENTIK_BOOTSTRAP_PASSWORD}' | base64 -d; echo
kubectl -n authentik get secret authentik-credentials \
  -o jsonpath='{.data.AUTHENTIK_BOOTSTRAP_EMAIL}' | base64 -d; echo
```
