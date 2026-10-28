---
title: Quellen
book_version: "1.4.0"
---

# Quellen

> **Buch** v1.4.0 · Stand: 2026-10-28

- App: [`apps/dev/bookstack/`](../../../../apps/dev/bookstack/)
- README: [`apps/dev/bookstack/README.md`](../../../../apps/dev/bookstack/README.md)
- MariaDB STS: [`mariadb.yaml`](../../../../apps/dev/bookstack/mariadb.yaml)
- MariaDB gosu-Image: [`mariadb-image/`](../../../../apps/dev/bookstack/mariadb-image/)
- OIDC Env (`AUTH_AUTO_INITIATE`, Claims): [`values.yaml`](../../../../apps/dev/bookstack/values.yaml) / `helm-manifest.yaml`
- Authentik BookStack-OAuth (Terraform): Infra_LAB `terraform/authentik/modules/shared/authentik_bookstack.tf`
- Theme / PDF PostSync: [`theme-modules-sync.yaml`](../../../../apps/dev/bookstack/theme-modules-sync.yaml)
- OIDC Relink PostSync: [`oidc-relink.yaml`](../../../../apps/dev/bookstack/oidc-relink.yaml)
- Shelf-Permissions (exec, kein RWO-Multi-Attach): [`copy-shelf-permissions-cronjob.yaml`](../../../../apps/dev/bookstack/copy-shelf-permissions-cronjob.yaml)
- Rolle Familie / `content-export`: Bootstrap in [`docs-import-configmap.yaml`](../../../../apps/dev/bookstack/docs-import-configmap.yaml)
- Forgejo Day-2 Repos / Pull-Token: Infra_LAB `terraform/forgejo`
- SecretSpec `REGISTRY_*` / `registry-pull`: Infra_LAB `ansible/playbooks/k3s_cluster/secrets/`
- Upstream Auth: [BookStack OIDC](https://www.bookstackapp.com/docs/admin/oidc-auth/)
- Upstream PDF: [BookStack PDF rendering](https://www.bookstackapp.com/docs/admin/pdf-rendering/)
- Chart: [gabe565/bookstack](https://charts.gabe565.com/charts/bookstack/)
- Image: [linuxserver/bookstack](https://docs.linuxserver.io/images/docker-bookstack/)
- Import-Checkliste: [`docs/bookstack/IMPORT.md`](../../IMPORT.md)
- Infra_LAB Import (Sources, SecretSpec): Infra_LAB `docs/bookstack/IMPORT.md`
