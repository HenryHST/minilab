---
book: Minilab
book_version: "1.1.1"
chapter: kubeconfig-user
chapter_version: "1.0.1"
updated: "2026-10-06"
---
# kubeconfig-user (cluster-admin)

> **Buch** v1.1.1 · **Kapitel** v1.0.1 · Stand: 2026-10-06

Ops-App unter `apps/ops/kubeconfig-user` (Argo CD ApplicationSet **ops**, Sync-Wave **1**). Basiert auf dem Upstream-Muster [example.yaml](https://github.com/colinjlacy/kubeconfig-creation-script/blob/main/example.yaml): ServiceAccount + `cluster-admin` + Token-Secret; zusätzlich ein PostSync-Job, der eine exportierbare Kubeconfig als Secret schreibt.

![kubeconfig-user](https://github.com/HenryHST/Infra_LAB/blob/main/docs/diagrams/archify/exports/kubeconfig-user.png)

Interaktiv: [`kubeconfig-user.html`](https://github.com/HenryHST/Infra_LAB/blob/main/docs/diagrams/archify/kubeconfig-user.html) (Infra_LAB).

## Was entsteht

| Objekt | Name |
|--------|------|
| Namespace | `kubeconfig-user` |
| ServiceAccount | `cluster-admin-sa` (`userType: human`) |
| ClusterRoleBinding | `cluster-admin-sa-cluster-admin` → Role `cluster-admin` |
| Token-Secret | `cluster-admin-sa-token` (`kubernetes.io/service-account-token`) |
| Job | `kubeconfig-user-write-kubeconfig` (Argo PostSync / Helm hook) |
| Kubeconfig-Secret | `kubeconfig-user-kubeconfig` (Key `config`, API `https://192.168.0.40:6443`) |

## Flags

| Flag | Wirkung |
|------|---------|
| Listeneintrag in `applicationset-ops.yaml` | App deployed / nicht deployed |
| `enabled` / `kubeconfigJob.enabled` in `values.yaml` | Re-Render von `helm-manifest.yaml` |

## Kubeconfig lokal nutzen

Voraussetzungen: Argo hat die App gesynct, der PostSync-Job ist fertig, und du hast bereits einen Cluster-Zugang (hub01 / bestehendes Admin-Kubeconfig), um das Secret zu lesen. API-VIP `192.168.0.40:6443` muss vom Client aus erreichbar sein (LAN).

### 1. Secret prüfen

```bash
kubectl -n kubeconfig-user get job,pods,secret
kubectl -n kubeconfig-user get secret kubeconfig-user-kubeconfig
```

Fehlt das Secret: Job-Logs ansehen (`kubectl -n kubeconfig-user logs job/kubeconfig-user-write-kubeconfig`).

### 2. Datei speichern

```bash
kubectl -n kubeconfig-user get secret kubeconfig-user-kubeconfig \
  -o jsonpath='{.data.config}' | base64 -d > ~/.kube/nXk3-cluster-admin
chmod 600 ~/.kube/nXk3-cluster-admin
```

### 3. Verwenden

```bash
# Session-weit
export KUBECONFIG=~/.kube/nXk3-cluster-admin
kubectl get nodes
kubectl auth can-i '*' '*' --all-namespaces   # erwartet: yes

# oder einmalig
kubectl --kubeconfig ~/.kube/nXk3-cluster-admin get pods -A
```

Optional als zusätzlicher Kontext in `~/.kube/config` mergen (statt `export`):

```bash
KUBECONFIG=~/.kube/config:~/.kube/nXk3-cluster-admin kubectl config view --flatten > /tmp/kubeconfig-merged
mv /tmp/kubeconfig-merged ~/.kube/config
chmod 600 ~/.kube/config
kubectl config use-context nXk3   # Context-Name = clusterName aus Values
```

**Warnung:** Inhalt = **cluster-admin**-Token. Nicht committen, nicht öffentlich teilen, nur auf vertrauenswürdigen Rechnern ablegen.

## Token rotieren

```bash
kubectl -n kubeconfig-user delete secret cluster-admin-sa-token kubeconfig-user-kubeconfig
# App neu syncen (oder Job erneut laufen lassen), damit Token-Secret + Kubeconfig neu geschrieben werden.
```

## Pflege Chart

```bash
cd apps/ops/kubeconfig-user
helm template kubeconfig-user ./chart -f values.yaml --namespace kubeconfig-user > helm-manifest.yaml
```

Details: `apps/ops/kubeconfig-user/README.md`. Day-2-Hinweis auch im Buch **K3s** (Infra_LAB).
