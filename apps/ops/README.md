# apps/ops

Platform ops: TLS, registry, IdP, edge publish, cluster UI.

| App | Sync wave | Namespace |
|-----|-----------|-----------|
| cert-manager | 0 | certmanager |
| cert-manager-webhook-hetzner | 1 | certmanager |
| registry | 0 | kube-system |
| registry-ui | 0 | registry-ui |
| newt | 0 | newt |
| system-upgrade-controller | 1 | system-upgrade |
| node-local-dns | 1 | kube-system |
| kubeconfig-user | 1 | kubeconfig-user |
| authentik | 2 | authentik |
| headlamp | 2 | kube-system |
| hubble-ui | 2 | kube-system |
| pangolin-publish | 3 | pangolin-publish |
| wud | 3 | wud |

Stub (not in ApplicationSet): `kargo/`.

**Image build (not an Argo app):** [`k8s-toolbox/`](k8s-toolbox/) — helper image replacing `alpine/k8s` (`ghcr.io/henryhst/k8s-toolbox` → mirror `git.stadthagen.dev/ops/k8s-toolbox`). CI: `.github/workflows/k8s-toolbox-image.yml`.

Managed by ApplicationSet `ops` / AppProject `ops`. See [ADR-0022](../../docs/adr/0022-apps-bucket-applicationsets.md).
