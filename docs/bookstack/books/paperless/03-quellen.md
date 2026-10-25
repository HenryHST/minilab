---
title: Quellen
book_version: "1.8.0"
---

# Quellen

> **Buch** v1.8.0 · Stand: 2026-10-25

- App-README: [`apps/dev/paperless/README.md`](../../../../apps/dev/paperless/README.md)
- Redis: [`apps/infra/redis/README.md`](../../../../apps/infra/redis/README.md)
- ADR-0026: [`docs/adr/0026-paperless-ngx.md`](../../../adr/0026-paperless-ngx.md)
- Infra_LAB prereq hostPaths: Role `henryhst.k3s.prereq` → `tasks/app_hostpaths.yaml`
- Archify OIDC-Gruppen: [`docs/diagrams/archify/paperless-oidc-groups.html`](../../../diagrams/archify/paperless-oidc-groups.html)
- Archify Provisionierung: [`docs/diagrams/archify/paperless-groups-provision.html`](../../../diagrams/archify/paperless-groups-provision.html)
- Infra_LAB Authentik: `terraform/authentik/modules/dev/authentik_paperless.tf`, `access_control_users.tf`
- Upstream: [paperless-ngx](https://docs.paperless-ngx.com/) · Config [`PAPERLESS_SOCIAL_ACCOUNT_SYNC_GROUPS`](https://docs.paperless-ngx.com/configuration/#PAPERLESS_SOCIAL_ACCOUNT_SYNC_GROUPS) · [`PAPERLESS_FILENAME_FORMAT`](https://docs.paperless-ngx.com/configuration/#PAPERLESS_FILENAME_FORMAT) · Management [`document_renamer`](https://docs.paperless-ngx.com/administration/#renamer)
- Helper-Image: [`apps/ops/k8s-toolbox/`](../../../../apps/ops/k8s-toolbox/) · Tag **1.0.1** (Forgejo SoT)
- CVE-Hygiene: [Trivy & CVE-Hygiene](06-trivy-cve-hygiene.md)
- Issue: [HenryHST/minilab#64](https://github.com/HenryHST/minilab/issues/64)
