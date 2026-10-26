---
title: Quellen
book_version: "1.9.2"
---

# Quellen

> **Buch** v1.9.2 · Stand: 2026-10-26

- App-README: [`apps/dev/paperless/README.md`](../../../../apps/dev/paperless/README.md)
- Valkey (shared): [`apps/infra/redis/README.md`](../../../../apps/infra/redis/README.md)
- ADR-0015: [`docs/adr/0015-backup-restore-cronjobs.md`](../../../adr/0015-backup-restore-cronjobs.md) (Paperless 05:00 UTC Exporter)
- ADR-0026: [`docs/adr/0026-paperless-ngx.md`](../../../adr/0026-paperless-ngx.md)
- ADR-0035: [`docs/adr/0035-paperless-cnpg.md`](../../../adr/0035-paperless-cnpg.md)
- Infra_LAB prereq hostPaths: Role `henryhst.k3s.prereq` → `tasks/app_hostpaths.yaml`
- Archify OIDC-Gruppen: [`docs/diagrams/archify/paperless-oidc-groups.html`](../../../diagrams/archify/paperless-oidc-groups.html)
- Archify Provisionierung: [`docs/diagrams/archify/paperless-groups-provision.html`](../../../diagrams/archify/paperless-groups-provision.html)
- Archify Backup / Restore: [`paperless-backup.html`](../../../diagrams/archify/paperless-backup.html) · [`paperless-restore-workflow.html`](../../../diagrams/archify/paperless-restore-workflow.html)
- Infra_LAB Authentik: `terraform/authentik/modules/dev/authentik_paperless.tf`, `access_control_users.tf`
- Upstream: [paperless-ngx](https://docs.paperless-ngx.com/) · [Exporter](https://docs.paperless-ngx.com/administration/#exporter) · [Importer](https://docs.paperless-ngx.com/administration/#importer) · Config [`PAPERLESS_SOCIAL_ACCOUNT_SYNC_GROUPS`](https://docs.paperless-ngx.com/configuration/#PAPERLESS_SOCIAL_ACCOUNT_SYNC_GROUPS) · [`PAPERLESS_FILENAME_FORMAT`](https://docs.paperless-ngx.com/configuration/#PAPERLESS_FILENAME_FORMAT) · [`PAPERLESS_OCR_DESKEW`](https://docs.paperless-ngx.com/configuration/#PAPERLESS_OCR_DESKEW) · Management [`document_renamer`](https://docs.paperless-ngx.com/administration/#renamer) · [Workflows](https://docs.paperless-ngx.com/usage/#workflows)
- Helper-Image: [`apps/ops/k8s-toolbox/`](../../../../apps/ops/k8s-toolbox/) · Tag **1.0.1** (Forgejo SoT)
- Backup & Restore: [Backup & Restore](07-backup-restore.md)
- CVE-Hygiene: [Trivy & CVE-Hygiene](06-trivy-cve-hygiene.md)
- Issue: [HenryHST/minilab#64](https://github.com/HenryHST/minilab/issues/64)
