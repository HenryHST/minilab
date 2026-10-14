---
title: Deploy & Verify
book_version: "1.0.0"
---

# Deploy & Verify

> **Buch** v1.0.0 · Stand: 2026-10-14

## Secrets

SMTP aus Infra_LAB SecretSpec `AUTHENTIK_EMAIL_PASSWORD` → Secret `stirling-pdf/stirling-pdf-smtp`:

```bash
cd ansible/playbooks/k3s_cluster
ansible-playbook site.yaml --tags secrets
kubectl -n stirling-pdf get secret stirling-pdf-smtp
```

## Sync

Argo App `stirling-pdf` aus minilab `apps/dev/stirling-pdf/`.

## Verify

```bash
kubectl -n stirling-pdf get deploy,pods,ingressroute
kubectl -n stirling-pdf get deploy stirling-pdf -o jsonpath='{.spec.template.spec.containers[0].resources}' ; echo
curl -fsS https://stirling-pdf.stadthagen.dev/api/v1/info/status
```

Erwartete Resources u. a. `ephemeral-storage` Request `2Gi` / Limit `4Gi`.
