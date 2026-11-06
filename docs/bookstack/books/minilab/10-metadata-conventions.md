---
title: Labels & Annotations
book_version: "1.5.0"
---

# Labels & Annotations (Conventions)

Lab-Contract für Kubernetes-Objekt-Metadata. Referenzen:

- [Annotations](https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/)
- [Labels and Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Recommended Labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)

Lint: `./scripts/run-metadata-lint.sh` · CI Workflow `metadata-lint.yml`.

## Labels vs Annotations

| | Labels | Annotations |
|--|--------|-------------|
| Zweck | Identifying; **Selektion** (Service, NetworkPolicy, kubectl) | Non-identifying; Tool-Directives |
| Beispiele Lab | `app.kubernetes.io/name`, `app:`, `cnpg.io/reload`, `grafana_dashboard`, `release: kube-prometheus-stack` | `argocd.argoproj.io/*`, `grafana_folder`, `lbipam.cilium.io/*` |

## Label-Contract (Workload)

```yaml
app.kubernetes.io/name: <app>
app.kubernetes.io/part-of: <product>    # Produkt, nicht Namespace; nicht kube-system
app.kubernetes.io/component: <tier>     # z. B. postgresql bei CNPG
app.kubernetes.io/managed-by: argocd    # hand-rolled; Helm behält Helm
# Phase 1 dual-write (bis Selector-Migration):
app: <app>
```

**Phase 1:** Pod-Templates dual-write; Service/NP-`podSelector` bleibt auf `app:`.  
**Phase 2 (später):** Selectors auf `app.kubernetes.io/name` flippen, dann optional `app:` droppen.  
**Nie** Selectors flippen ohne Pod-Labels.

Vorlage: [`apps/_templates/networkpolicy-app.yaml`](../../../../apps/_templates/networkpolicy-app.yaml) (Stichwort dual-write). Pilot: Kromgo Deployment.

## Wichtige Lab-Regeln

| Thema | Regel |
|-------|--------|
| CNPG TLS Secret reload | Label `cnpg.io/reload` (nicht Annotation) — siehe CNPG Docs |
| Grafana Dashboards | Label `grafana_dashboard: "1"` **und** Annotation `grafana_folder` |
| Prometheus scrape | PodMonitor/ServiceMonitor/PrometheusRule: `release: kube-prometheus-stack` |
| Longhorn Replica-Count | **Nicht** per PVC-Annotation (`volume-replica-count` / `numberOfReplicas` werden ignoriert). StorageClass-Parameter oder `kubectl patch volume.longhorn.io …` |
| Newt seccomp | Deprecated Annotation `container.seccomp.security.alpha.kubernetes.io/pod` + container `seccompProfile` — Chart-Schema-Workaround; Follow-up wenn Schema nested `podSecurityContext.seccompProfile` erlaubt |
| Keine Secrets in Annotations | Keine Keys/Values mit Passwörtern, Tokens, PEM |

## Verify

```bash
./scripts/run-metadata-lint.sh
python3 scripts/test_metadata_lint.py
```
