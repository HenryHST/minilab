---
title: Quellen
book_version: "1.3.0"
---


# Quellen

> **Buch** v1.3.0 · Stand: 2026-10-16

- App: [`apps/dev/stirling-pdf/`](../../../../apps/dev/stirling-pdf/)
- README: [`apps/dev/stirling-pdf/Readme.md`](../../../../apps/dev/stirling-pdf/Readme.md)
- Upstream: [Stirling Production Deployment Guide](https://docs.stirlingpdf.com/Production-Deployment-Guide/)
- Multipart/Boundary (Upstream): [PR #5522](https://github.com/Stirling-Tools/Stirling-PDF/pull/5522)
- Secrets: Infra_LAB `AUTHENTIK_EMAIL_PASSWORD` → `stirling-pdf-smtp`
- Day-0 Blueprint: [`apps/ops/authentik/blueprints/day0-stirling-pdf.yaml`](../../../../apps/ops/authentik/blueprints/day0-stirling-pdf.yaml)
- Gruppen TF: Infra_LAB `terraform/authentik/modules/shared/authentik_stirling_pdf.tf`
- ADR-0017 (Day-0 vs TF): Infra_LAB `docs/adr/0017-authentik-day0-blueprints-und-tf-reconcile.md`
- Upstream iOS empty multipart: [Stirling-PDF#8446](https://github.com/Stirling-Tools/Stirling-PDF/issues/8446)
