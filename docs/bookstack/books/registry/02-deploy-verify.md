---
title: Deploy & Verify
book_version: "1.0.0"
---

# Deploy & Verify

> **Buch** v1.0.0 · Stand: 2026-10-09

## Voraussetzungen

1. Argo Apps `registry` / `registry-ui` synced (Wave 0).
2. SecretSpec `REGISTRY_PASSWORD` gesetzt (Infra_LAB) und Secrets angewandt — **bevor** htpasswd im Deployment aktiv ist (sonst Mount fehlt).
3. DNS `registry.stadthagen.dev` / `registry-ui.stadthagen.dev` → Traefik (`192.168.0.215`).
4. TLS-Certificates Ready (`registry-tls`, `registry-ui-tls`).

## Secrets (htpasswd)

| Secret | Namespace | Inhalt |
|--------|-----------|--------|
| `registry-auth` | `kube-system` | `username`, `password`, `htpasswd` (Mount `/auth/htpasswd`) |
| `registry-pull` | `kube-system` | `kubernetes.io/dockerconfigjson` für Image-Pulls |

```bash
cd ansible/playbooks/k3s_cluster/secrets
secretspec set REGISTRY_PASSWORD --profile cluster --provider cluster_age
cd ..
ansible-playbook site.yaml --tags secrets --limit nxk3-cp01
```

Ansible leitet bcrypt-`htpasswd` und dockerconfig aus dem Passwort ab (User fest **`registry`**).

Probes am Registry-Deployment: **tcpSocket** (unauthentifiziertes `GET /v2/` → 401).

## Docker login / push

```bash
docker login registry.stadthagen.dev -u registry
docker tag alpine:latest registry.stadthagen.dev/library/alpine:latest
docker push registry.stadthagen.dev/library/alpine:latest
```

## In-Cluster Pulls

```yaml
imagePullSecrets:
  - name: registry-pull
```

Secret ggf. in das App-Namespace kopieren oder referenzieren.

## Registry UI

- Host: https://registry-ui.stadthagen.dev (Authentik ForwardAuth)
- `REGISTRY_SECURED=true` — nach UI-Login zusätzlich Registry-Basic (gleicher User `registry`)
- Proxied in-cluster auf `kube-registry.kube-system.svc:5000`

## Checks

```bash
# anonym → 401
curl -sk -o /dev/null -w '%{http_code}\n' https://registry.stadthagen.dev/v2/

# mit Login → 200
curl -sk -u 'registry:$PASSWORD' https://registry.stadthagen.dev/v2/
curl -sk -u 'registry:$PASSWORD' https://registry.stadthagen.dev/v2/_catalog

kubectl -n kube-system get deploy kube-registry
kubectl -n registry-ui get deploy
kubectl -n argocd get application registry registry-ui
```

Erwartung: Deployments Ready; Catalog listet Repos nach dem ersten Push.
