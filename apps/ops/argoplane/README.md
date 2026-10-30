# ArgoPlane

Argo CD UI extensions (Metrics, Networking, Logs, Vulnerabilities, Events) with backends in namespace `argocd`. Complements **Trivy Insights** (Ansible Day-0); this app is Day-2 backends only.

| | |
|--|--|
| Argo | ApplicationSet `ops`, sync wave `2`, namespace `argocd` |
| Chart | `argoplane` **1.6.1** from `oci://ghcr.io/natrontech/charts` (app **1.6.1**) |
| Extensions | metrics → Prometheus; networking → Hubble Relay; logs → Loki; vulnerabilities → Trivy CRDs; events → K8s Events |
| Styles / branding / docs | off |

## Prerequisites (Ansible wire)

Without Day-0 wiring, backends run but UI tabs stay dead. Infra_LAB role `henryhst.k3s.argo_cd` with `argocd_argoplane.enabled: true` must set:

1. `server.enable.proxy.extension` on `argocd-cmd-params-cm`
2. `extension.config.{metrics,networking,logs,vulnerabilities,events}` on `argocd-cm`
3. RBAC `extensions, invoke` for `role:admin` (five names)
4. Init container `ghcr.io/natrontech/argoplane-ui-extensions:1.6.1` on `argocd-server` (shared `extensions` volume, next to Trivy Insights)

Apply: `ansible-playbook site.yaml --tags argocd` → hard-reload `https://argocd.stadthagen.dev`.

## Deploy order

1. Push this values + ApplicationSet/AppProject → Argo Sync `argoplane` (backends Running).
2. Ansible `--tags argocd` (proxy / CM / RBAC / UI init) → `argocd-server` rollout.
3. Browser hard-reload → Application/Resource tabs Metrics, Networking, Logs, Vulnerabilities, Events.

## Verify

```bash
kubectl -n argocd get application argoplane
kubectl -n argocd get deploy -l app.kubernetes.io/part-of=argoplane
kubectl -n argocd get cm argocd-cm -o yaml | grep extension.config
kubectl -n argocd get cm argocd-cmd-params-cm -o yaml | grep proxy.extension
kubectl -n argocd get deploy -l app.kubernetes.io/name=argocd-server -o yaml | grep argoplane-ui-extensions
```

Upstream: [natrontech/argoplane](https://github.com/natrontech/argoplane) · docs: https://docs.argoplane.io/deployment  
BookStack: Infra_LAB `docs/bookstack/books/argo-cd/09-argoplane.md`
