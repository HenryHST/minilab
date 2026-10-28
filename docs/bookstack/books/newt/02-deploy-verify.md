---
book: Newt
book_version: "1.0.0"
chapter: deploy-verify
chapter_version: "1.0.0"
updated: "2026-10-28"
---

# Deploy & Verify

> **Buch** v1.0.0 · **Kapitel** v1.0.0 · Stand: 2026-10-28

## Voraussetzungen

1. SecretSpec Keys für Newt gesetzt, dann Infra_LAB: `ansible-playbook site.yaml --tags secrets` → Secret `newt/newt-main-tunnel-auth` (`PANGOLIN_ENDPOINT`, `NEWT_ID`, `NEWT_SECRET`).
2. Argo Application `newt` Synced/Healthy (Wave 0, vor Publish-Wave-3).

## Sync

Multi-Source Helm: Chart von Fossorial + Values aus minilab (`$values/apps/ops/newt/values.yaml`). Automated + self-heal.

Affinity: bevorzugte Scheduling auf `kubernetes.io/arch=arm64` (Pis).

## Checks

```bash
kubectl -n argocd get application newt
kubectl -n newt get deploy,pods,svc,secret/newt-main-tunnel-auth
kubectl -n newt get deploy newt-newt-main-tunnel -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
# Erwartung: docker.io/fosrl/newt:1.19.1
```

SecurityContext / ConfigAudit: [Trivy ConfigAudit](03-trivy-config-audit.md).
