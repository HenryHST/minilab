# vw-restore → merged into podcraft

**Status:** deprecated / merged (2026-11-07)

The Vaultwarden restore UI no longer deploys as a standalone app.

| Was | Now |
|-----|-----|
| Host `vw-restore.stadthagen.dev` | `podcraft.stadthagen.dev/restore/vaultwarden` |
| Image `git.stadthagen.dev/dev/vw-restore` | `git.stadthagen.dev/dev/podcraft` (restore code included) |
| Day-0 `day0-vw-restore` | removed via blueprint `state: absent`; use `day0-podcraft` |
| Jinja UI in this tree | FastAPI JSON `/api/v1/restore/*` + SPA in podcraft |

Jobs, ConfigMap `vaultwarden-restore`, and PVCs remain in namespace `vaultwarden`.
See `../RESTORE-UI-MERGED.md` and `../podcraft-restore-rbac.yaml`.

Do **not** continue building or publishing `dev/vw-restore`.
