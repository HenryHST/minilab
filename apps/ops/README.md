# apps/ops

Platform ops: TLS, registry, IdP, edge publish, cluster UI.

| App | Sync wave | Namespace |
|-----|-----------|-----------|
| cert-manager | 0 | certmanager |
| cert-manager-webhook-hetzner | 1 | certmanager |
| registry | 0 | kube-system |
| registry-ui | 0 | registry-ui |
| newt | 0 | newt |
| argocd-image-updater | 1 | argocd |
| system-upgrade-controller | 1 | system-upgrade |
| kubeconfig-user | 1 | kubeconfig-user |
| authentik | 2 | authentik |
| headlamp | 2 | kube-system |
| hubble-ui | 2 | kube-system |
| pangolin-publish | 3 | pangolin-publish |

Stub (not in ApplicationSet): `kargo/`.

Managed by ApplicationSet `ops` / AppProject `ops`. See [ADR-0022](../../docs/adr/0022-apps-bucket-applicationsets.md).
