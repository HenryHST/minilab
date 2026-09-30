---
title: Deploy und Verify
book_version: "1.1.0"
---

# Deploy und Verify

## Voraussetzungen

1. SecretSpec `TERMIX_OAUTH_CLIENT_SECRET` und `TERMIX_HA_CRYPTO_HEX` → `--tags secrets`.
2. Secrets `termix-db`, `termix-ha`, `termix-oauth` im Namespace `termix`.
3. Authentik-App `termix`, Gruppe `Termix Admins`.
4. ApplicationSet `dev` listet `termix`.
5. CloudNativePG-Operator Ready, CRD `clusters.postgresql.cnpg.io`.

## Sync

```bash
kubectl -n argocd get application termix
kubectl -n termix get deploy,pods,svc,cluster,cronjob,certificate
kubectl -n cnpg-system get pods,networkpolicy
```

## Checks

1. https://termix.stadthagen.dev zeigt die Login-Seite. OIDC über den Reiter External.
2. Deployment `termix` ist `2/2`. Logs enthalten `postgres database ready`.
3. `kubectl -n termix get cluster termix` meldet `Cluster in healthy state` und `READY 1`.
4. Service `termix-rw` hat Port 5432.
5. Ein manueller Job aus `termix-backup-cron` schreibt `termix-*.sql.gz` und nennt `termix-rw` im Log.
6. `kubectl -n termix get scheduledbackup termix-snapshot` existiert. Ein `Backup` daraus wird `completed`.
7. PodMonitor `termix-instances` trägt `release: kube-prometheus-stack`. Der Operator löscht einen Monitor, der wie der Cluster heißt, sobald `enablePodMonitor` aus ist.
