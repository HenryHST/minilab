# Stirling PDF

PDF toolkit on `https://stirling-pdf.stadthagen.dev` (Argo app `stirling-pdf`).

Homepage-Eintrag siehe [`apps/dev/web/config/services.yaml`](https://github.com/HenryHST/minilab/blob/main/apps/dev/web/config/services.yaml).

## Auth (ForwardAuth)

SSO via Authentik Outpost `ak-outpost-stirling-pdf` (Day-0 blueprint `day0-stirling-pdf`). Traefik Middleware `stirling-pdf-authentik`. Access groups `stirling_pdf_admins` / `stirling_pdf_users` (Infra_LAB Terraform). Gatus SSO check expects **302** when unauthenticated.

## Configuration (GitOps)

- Locale / UI: `de-DE` / `de_DE` via ConfigMap `stirling-pdf-settings` → `/configs/custom_settings.yml`
- Upload limit: `2GB` (app only — **no** Traefik buffering; buffering broke multipart/OCR)
- Traefik: `ServersTransport` `responseHeaderTimeout: 35m` for OCR/LibreOffice
- Updates: `system.showUpdate: false`
- Mail / invites: `mail.henrystadthagen.de:465`, user `auto@henrystadthagen.de`
- `processExecutor`: LibreOffice/Tesseract session limits (docs defaults)
- Resources: memory 512Mi/2Gi; **ephemeral-storage 2Gi/4Gi** (DiskPressure / 2GB uploads; keep `-fat` for LibreOffice)
- BookStack: `docs/bookstack/books/stirling-pdf/`

## Secrets

SMTP password comes from Infra_LAB SecretSpec `AUTHENTIK_EMAIL_PASSWORD` → K8s Secret `stirling-pdf/stirling-pdf-smtp` (`password` → env `MAIL_PASSWORD`):

```bash
cd ansible/playbooks/k3s_cluster
ansible-playbook site.yaml --tags secrets
kubectl -n stirling-pdf get secret stirling-pdf-smtp
```

Docs: [Stirling Production Deployment Guide](https://docs.stirlingpdf.com/Production-Deployment-Guide/).
