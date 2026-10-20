---
title: Upgrade
book_version: "1.2.0"
chapter: upgrade
chapter_version: "1.0.0"
updated: "2026-10-20"
---

# Upgrade

> **Buch** v1.2.0 · **Kapitel** v1.0.0 · Stand: 2026-10-20

Wiederverwendbare Anleitung, um **Trivy Operator** und den built-in **Trivy-Server** im nXk3-Cluster selbst zu aktualisieren. Deploy-Pfad: Argo ApplicationSet `ops` → Helm-Chart + Git-Values (`apps/ops/trivy-operator/`).

## Aktueller Stand (dieses Release)

| Komponente | Pin |
|------------|-----|
| Helm-Chart | **0.37.0** (`applicationset-ops.yaml` → `helmVersion`) |
| Operator (`appVersion`) | **0.35.0** |
| Trivy-Server-Image | **0.76.0** (`trivy.image.tag` in `values.yaml`) |

## Wichtig: Chart ≠ Operator ≠ Trivy

- Die **Chart-Version** (z. B. `0.37.0`) ist nicht die Operator-Version.
- Die Operator-Version steht als Chart-`appVersion` (Image-Tag, wenn `image.tag` leer).
- Der built-in Server nutzt `trivy.image.tag` — der Chart-Default kann hinter der gewünschten Trivy-Version liegen → bei Bedarf **explizit pinnen**.

## 1) Mapping nachschlagen

```bash
helm repo add aqua https://aquasecurity.github.io/helm-charts/
helm repo update
# Chart finden, dessen appVersion dem gewünschten Operator entspricht:
helm search repo aqua/trivy-operator --versions | head -20
helm show chart aqua/trivy-operator --version <CHART_VERSION>
# → appVersion: z. B. 0.35.0

# Default-Trivy-Tag im Chart:
helm show values aqua/trivy-operator --version <CHART_VERSION> \
  | rg -n 'repository:.*trivy$|^\s+tag:'
```

Wenn `appVersion` passt, aber `trivy.image.tag` nicht die gewünschte Server-Version ist → Tag in Git-Values setzen.

## 2) Pins in Git setzen

1. [`apps/argocd-apps/raw/applicationset-ops.yaml`](../../../../apps/argocd-apps/raw/applicationset-ops.yaml) — Eintrag `trivy-operator` → `helmVersion: "<CHART_VERSION>"`.
2. [`apps/ops/trivy-operator/values.yaml`](../../../../apps/ops/trivy-operator/values.yaml) — bei Bedarf:

```yaml
trivy:
  ignoreUnfixed: true
  image:
    tag: "<TRIVY_VERSION>"   # z. B. "0.76.0"
```

3. Doku mitziehen: App-README, [ADR-0031](../../../adr/0031-trivy-operator.md), [Architektur](02-architektur.md), Archify-Label, dieses Kapitel + `meta.yaml` / Buch-CHANGELOG.

## 3) Rollout

```bash
# Nach Merge auf main (Argo automated sync + selfHeal):
kubectl -n argocd annotate application trivy-operator \
  argocd.argoproj.io/refresh=hard --overwrite
kubectl -n argocd get application trivy-operator
# erwartet: Synced / Healthy (kurz Progressing ok)
```

## 4) Verify

```bash
kubectl -n trivy-system get deploy,sts,svc,servicemonitor,pods
kubectl -n trivy-system get deploy trivy-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
# erwartet: …/trivy-operator:<OPERATOR_VERSION>

kubectl -n trivy-system get sts -o jsonpath='{range .items[*].spec.template.spec.containers[*]}{.image}{"\n"}{end}'
# erwartet: …/trivy:<TRIVY_VERSION>

kubectl -n trivy-system logs deploy/trivy-operator --tail=50
kubectl get vulnerabilityreports -A | head
# Grafana: Folder Trivy → Dashboard 17813
```

## 5) Rollback

1. `helmVersion` und ggf. `trivy.image.tag` auf den vorherigen Stand zurücksetzen.
2. Push → Argo Sync.
3. CRDs **nicht** löschen (löscht alle Reports) — siehe Upstream Helm-Docs.

## Nicht anfassen (eigene Pins)

| Thema | Ort |
|-------|-----|
| CI `trivy-action` | Infra_LAB / minilab GitHub Workflows |
| Argo UI Trivy Insights | Infra_LAB Ansible `argo_cd` Extension |
| Headlamp Trivy-Plugin | `apps/ops/headlamp` |
| Harbor Trivy-Adapter | Harbor-Role (Infra_LAB) |

## Quellen

- [Deploy und Verify](03-deploy-verify.md) · [Betrieb und Metrics](04-betrieb-metrics.md)
- Upstream: [Trivy Operator Helm](https://aquasecurity.github.io/trivy-operator/latest/getting-started/installation/helm/)
- Chart-Repo: [aquasecurity/helm-charts](https://aquasecurity.github.io/helm-charts/)
