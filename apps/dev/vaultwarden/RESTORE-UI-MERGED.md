# vaultwarden restore-ui (merged into podcraft)

Standalone Deploy/HTTPRoute/Cert/NP/PreSync Job removed 2026-11-07.

Restore UI+API now live in **podcraft**:
- SPA: `https://podcraft.stadthagen.dev/restore/vaultwarden`
- API: `/api/v1/restore/*`
- Manifests: `apps/dev/podcraft/` + `podcraft-restore-rbac.yaml` (this folder)
- Bootstrap PostSync (`restore-bootstrap.yaml`) unchanged

Former app sources under `restore-ui/` are kept only as reference; do not build `dev/vw-restore` anymore.
