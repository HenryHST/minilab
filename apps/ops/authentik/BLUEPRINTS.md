# Authentik Day-0 blueprints (Plan B)

Mounted via Helm `blueprints.configMaps` → worker `/blueprints/`.
Source of truth for **runtime** Day-0 objects that must exist before Terraform reconcile.

| File / key | Purpose | Owner |
|------------|---------|--------|
| `day0-combined-login.yaml` | Combined login: `password_stage` on stock identification; identification binding order 10; remove separate password binding | **Blueprint (this repo)** |
| `day0-registry-ui.yaml` | Proxy Provider + App + Outpost `ak-outpost-registry-ui` + group bindings (`registry_ui_admins` / `registry_ui_users` from TF) | **Blueprint (this repo)** |
| `day0-hubble-ui.yaml` | Proxy Provider + App + Outpost `ak-outpost-hubble-ui` + group bindings (`hubble_ui_admins` / `hubble_ui_users` from TF) | **Blueprint (this repo)** |
| `day0-n8n.yaml` | Proxy Provider + App + Outpost `ak-outpost-n8n` + group bindings | **Blueprint (this repo)** |

Do **not** manage the same objects in `Infra_LAB/terraform/authentik` (except identification `enrollment_flow` / `recovery_flow`, which stay TF with `ignore_changes` on `password_stage`).

After the outpost Service is Ready, re-enable Traefik ForwardAuth on `apps/ops/registry-ui` (main):

```yaml
middlewares:
  - name: registry-ui-authentik
```

Reconcile OAuth/LDAP/Brand via Infra_LAB (Template **05** / `authentik-bootstrap`). Basis-Login (Username+Password on one page) does **not** require reconcile once this Day-0 blueprint has applied:

```bash
ansible-playbook site.yaml --tags authentik-bootstrap
# or: cd terraform/authentik && ./scripts/reconcile.sh dev
```
