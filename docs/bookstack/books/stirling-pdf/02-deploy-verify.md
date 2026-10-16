---
title: Deploy & Verify
book_version: "1.3.0"
---


# Deploy & Verify

> **Buch** v1.3.0 · Stand: 2026-10-16

## Secrets

SMTP aus Infra_LAB SecretSpec `AUTHENTIK_EMAIL_PASSWORD` → Secret `stirling-pdf/stirling-pdf-smtp`:

```bash
cd ansible/playbooks/k3s_cluster
ansible-playbook site.yaml --tags secrets
kubectl -n stirling-pdf get secret stirling-pdf-smtp
```

## Sync

Argo App `stirling-pdf` aus minilab `apps/dev/stirling-pdf/` (inkl. Middleware + IngressRoute).

Day-0 Blueprint / Outpost: Argo App `authentik` (`blueprints-configmap` + Worker). Gruppen: Infra_LAB `terraform/authentik` reconcile.

## Verify

```bash
kubectl -n stirling-pdf get deploy,pods,ingressroute,middleware
kubectl -n authentik get svc,deploy ak-outpost-stirling-pdf
kubectl -n stirling-pdf get deploy stirling-pdf -o jsonpath='{.spec.template.spec.containers[0].resources}' ; echo

# Unauthentifiziert → ForwardAuth-Redirect (nicht 200)
curl -sI --max-redirs 0 https://stirling-pdf.stadthagen.dev | head -n5
```

Erwartung:

- Resources u. a. `ephemeral-storage` Request `2Gi` / Limit `4Gi`
- Middleware `stirling-pdf-authentik` an der IngressRoute
- Unauth: **HTTP 302** → `idp.stadthagen.dev` (Gatus SSO-Gruppe ebenso)
- Keine Traefik-Buffering-Middleware (siehe **Uploads & OCR**)

Statusseite: Endpoint `stirling-pdf` in Gruppe `sso` grün.
