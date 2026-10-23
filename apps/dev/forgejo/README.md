# Forgejo (git.stadthagen.dev)

Self-hosted Git + **Lab container registry** (replaces Distribution `registry.stadthagen.dev`).

| Item | Value |
|------|--------|
| App | Forgejo **16.0.6** (Helm chart **17.3.1**) |
| Namespace | `forgejo` |
| Sync wave | `3` (AppSet `dev`) |
| Nodes | App: `nxk3-w05` + `nxk3-w06`; Actions runner: **only** `nxk3-w06` (DinD sidecar — no host `docker.sock`) |
| DB | SQLite on Longhorn (CNPG prep in values — not cut over) |
| HTTPS | `https://git.stadthagen.dev` (Traefik) |
| SSH | `git@git-ssh.stadthagen.dev:org/repo.git` — LB `192.168.0.218:22` → container `2222` (shared VIP with Mosquitto) |
| Ext | `git-ext.stadthagen.dev` via pangolin-publish **`enabled: false`** |
| Backup | CronJob → RustFS bucket `forgejo-backups` |
| Metrics | `/metrics` on Service `forgejo-http` (ServiceMonitor); Ingress excludes PathPrefix `/metrics` |
| Grafana | `https://grafana.stadthagen.dev/d/forgejo-overview` (folder Forgejo) |
| Actions | `DEFAULT_ACTIONS_URL: self` (workflows use Forgejo Actions, not github.com by default) |
| Security | rootless image + `podSecurityContext`/`containerSecurityContext` UID 1000, `runAsNonRoot`, drop ALL |

## Secrets (Infra_LAB `k3s_secrets`)

| Secret | Keys |
|--------|------|
| `forgejo-oauth` | `key`=`forgejo`, `secret`=`FORGEJO_OAUTH_CLIENT_SECRET` |
| `forgejo-smtp` | `passwd` from `AUTHENTIK_EMAIL_PASSWORD` (mailer section) |
| `forgejo-admin` | `username` / `password` / `email` |
| `forgejo-backup-s3` | RustFS AWS_* + `S3_BUCKET` |
| `forgejo-runner` | optional `token`; if missing, runner init mints via admin API (`forgejo-admin`) |
| `registry-pull` | dockerconfig for `git.stadthagen.dev` |

## SSH (LAN)

1. UniFi DNS: A `git-ssh` → `192.168.0.218` (HTTPS `git` stays on Traefik LB).
2. Cilium: Mosquitto + Forgejo SSH share VIP via `lbipam.cilium.io/sharing-key: lan-218` (+ cross-namespace on both Services).
3. Add an SSH key in Forgejo UI (Settings → SSH / GPG Keys).
4. Verify (full checklist + interpretation: Infra_LAB BookStack **forgejo** → Runner/DNS):

```bash
kubectl -n mosquitto get svc
kubectl -n forgejo get svc | rg 'NAME|ssh'
# both LoadBalancer EXTERNAL-IP 192.168.0.218

kubectl -n forgejo get svc forgejo-ssh -o jsonpath='{.metadata.annotations}' ; echo
# sharing-key: lan-218 · sharing-cross-namespace: mosquitto

nc -vz 192.168.0.218 22
nc -vz 192.168.0.218 1883
ssh -T git@git-ssh.stadthagen.dev
# Hi there, You've successfully authenticated…
```

| Observation | Next step |
|-------------|-----------|
| Both `.218` | OK — run `ssh -T` |
| `forgejo-ssh` still ClusterIP / Mosquitto missing annotations | Sync Argo apps `forgejo` + `mosquitto` |
| Different IPs or `<pending>` | Check `describe svc` Events + Cilium LB pool |

## Registry cutover

1. Push/mirror images: `crane copy … git.stadthagen.dev/<owner>/<image>:<tag>` (SoT builds: Forgejo repos `dev/*`, `ops/k8s-toolbox`)
2. Retarget Image Updater + workload image refs to `git.stadthagen.dev`
3. Confirm `registry` / `registry-ui` removed from AppSet `ops` (done) and prune
4. Drop UniFi DNS `registry` / `registry-ui` when unused

## Restore

See Infra_LAB BookStack book **forgejo** → Backup/Restore. Download archive from `s3://forgejo-backups`, scale Forgejo to 0, extract into PVC `/data`, scale up.
