# n8n (Community) — Wave 3

Workflow automation on nXk3 with **Traefik ForwardAuth** (Authentik Outpost). No native OIDC (`N8N_SSO_*` is Enterprise-only).

| | |
|--|--|
| Host | https://n8n.stadthagen.dev |
| Namespace | `n8n` |
| Chart | [8gears/n8n-helm-chart](https://github.com/8gears/n8n-helm-chart) `2.1.1` / image `2.41.3` → committed `helm-manifest.yaml` ([ADR-0014](../../../docs/adr/0014-helm-strategie.md)) |
| Auth | ForwardAuth → `ak-outpost-n8n` (Day-0 `day0-n8n`); groups `n8n_admins` / `n8n_users` (TF) |
| DB | Postgres 16 hostPath on `nxk3-w01` |
| SMTP | `mail.henrystadthagen.de:465` / `auto@henrystadthagen.de` (Secret `n8n-smtp`) |
| Backup | Cron `03:30` UTC → NFS `…/n8n-backups` (pg_dump + `.n8n` tar, retention 7) |

## Auth model

1. Browser → Traefik → Authentik ForwardAuth (group PolicyBinding).
2. After SSO, **Community n8n still uses its local owner login** for the app itself.
3. Paths `/webhook`, `/webhook-test`, `/form` bypass ForwardAuth so external hooks work.

## Secrets (Infra_LAB)

| Secret | Keys | SecretSpec |
|--------|------|------------|
| `n8n-app` | `N8N_ENCRYPTION_KEY` | `N8N_ENCRYPTION_KEY` |
| `n8n-db` | `POSTGRES_PASSWORD` | `N8N_DB_PASSWORD` |
| `n8n-smtp` | `password` | `AUTHENTIK_EMAIL_PASSWORD` |

```bash
secretspec set N8N_ENCRYPTION_KEY "$(openssl rand -base64 32)"
secretspec set N8N_DB_PASSWORD "$(openssl rand -base64 24)"
# AUTHENTIK_EMAIL_PASSWORD already set for BookStack/etc.
ansible-playbook site.yaml --tags secrets
```

## DNS

Manual Hetzner **A** `n8n` → Traefik LB `192.168.0.215` (no Terraform `dns_records`, no pangolin-publish in v1).

## Regenerate helm-manifest

```bash
helm template n8n oci://8gears.container-registry.com/library/n8n --version 2.1.1 \
  -f values.yaml -n n8n > helm-manifest.yaml
```

## Verify

```bash
kubectl -n authentik get svc ak-outpost-n8n
kubectl -n n8n get middleware,ingressroute,certificate,deploy,sts
curl -sI https://n8n.stadthagen.dev | head -5   # 302 → idp
curl -sI https://n8n.stadthagen.dev/webhook/test | head -5  # no Authentik redirect
```

ADR: [0028-n8n](../../../docs/adr/0028-n8n.md).

## Data directory permissions

n8n data uses hostPath `/var/lib/n8n-data` on `nxk3-w01` (PVC `n8n-data`). `DirectoryOrCreate` makes the dir `root:root`; n8n runs as UID **1000** and fails with `EACCES ... /home/node/.n8n/config` if ownership is wrong.

**Durable fix:** InitContainer `volume-permissions` in `helm-manifest.yaml` runs `chown -R 1000:1000` before the app starts. After regenerating the chart template, re-add that init (or merge by hand).

**One-shot (emergency):**

```bash
kubectl -n n8n run n8n-fix-perms --rm -it --restart=Never \
  --overrides='{"spec":{"nodeSelector":{"kubernetes.io/hostname":"nxk3-w01"},"containers":[{"name":"fix","image":"busybox:1.36","command":["sh","-c","chown -R 1000:1000 /data"],"securityContext":{"runAsUser":0},"volumeMounts":[{"name":"data","mountPath":"/data"}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"n8n-data"}}]}}' \
  --image=busybox:1.36
```

Also set explicit `N8N_PORT=5678` (Service name `n8n` otherwise injects `N8N_PORT=tcp://…`).
