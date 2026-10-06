---
title: Policies
book_version: "1.0.0"
---

# Policies

Alle fünf Policies: `validationFailureAction: Audit`, meist `background: true`. Dateien unter `apps/infra/kyverno/policies/`.

| ClusterPolicy | Prüft |
|---------------|--------|
| `require-longhorn-storageclass` | PVC `storageClassName` ist `longhorn` oder leer (Default) |
| `require-non-root-or-no-privileged` | kein `privileged`, kein hostNetwork/hostPID/hostIPC |
| `require-requests-limits` | Container haben CPU- und Memory-**requests** |
| `prefer-proxmox-workers-for-longhorn-pods` | Pods mit PVC → `nodeSelector worker=true` (oder Affinity) |
| `restrict-image-registries` | Image-Registry in Allowlist bzw. Docker-Hub-Pfad ohne fremden Host |

### Excludes

Namespaces: `kube-system`, `kyverno`, `argocd`, `longhorn-system`, `traefik`, `cnpg-system`, `certmanager`, `node-feature-discovery`, `k8tz`, `trivy-system`.

Zusätzlich Label **`policy.stadthagen.dev/exempt: "true"`** auf Namespace oder Objekt.

### Beispiel (Ausschnitt)

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-longhorn-storageclass
spec:
  validationFailureAction: Audit
  background: true
  rules:
    - name: longhorn-or-default
      validate:
        pattern:
          spec:
            =(storageClassName): "longhorn | ''"
```

Image-Allowlist: `ghcr.io`, `registry.k8s.io`, `docker.io` / `index.docker.io`, `quay.io`, `registry.stadthagen.dev`. Kurze Docker-Hub-Namen ohne Registry-Host sind erlaubt.
