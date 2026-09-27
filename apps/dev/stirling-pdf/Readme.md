# Stirling PDF

PDF toolkit on `https://stirling-pdf.stadthagen.dev` (Argo app `stirling-pdf`).

Homepage-Eintrag siehe [`apps/dev/web/config/services.yaml`](https://github.com/HenryHST/minilab/blob/main/apps/dev/web/config/services.yaml).

## Configuration (GitOps)

- Locale / UI: `de-DE` / `de_DE` via ConfigMap `stirling-pdf-settings` → `/configs/custom_settings.yml`
- Upload limit: `2GB` (app + Traefik Middleware `stirling-pdf-upload`)
- Updates: `system.showUpdate: false`
- Mail / invites: `mail.henrystadthagen.de:465`, user `auto@henrystadthagen.de`
- `processExecutor`: LibreOffice/Tesseract session limits (docs defaults)

## Secrets

SMTP password comes from Infra_LAB SecretSpec `AUTHENTIK_EMAIL_PASSWORD` → K8s Secret `stirling-pdf/stirling-pdf-smtp` (`password` → env `MAIL_PASSWORD`):

```bash
cd ansible/playbooks/k3s_cluster
ansible-playbook site.yaml --tags secrets
kubectl -n stirling-pdf get secret stirling-pdf-smtp
```

Docs: [Stirling Production Deployment Guide](https://docs.stirlingpdf.com/Production-Deployment-Guide/).
