# Authentik Day-0 blueprints (Plan B)

Mounted via Helm `blueprints.configMaps` → worker `/blueprints/`.
Source of truth for **runtime** Day-0 objects that must exist before Terraform reconcile.

| File / key | Purpose | Owner |
|------------|---------|--------|
| `day0-registry-ui.yaml` | Proxy Provider + App + Outpost `ak-outpost-registry-ui` | **Blueprint (this repo)** |

Do **not** manage the same objects in `Infra_LAB/terraform/authentik`.

After the outpost Service is Ready, re-enable Traefik ForwardAuth on `infra/registry-ui` (main):

```yaml
middlewares:
  - name: registry-ui-authentik
```

Reconcile OAuth/LDAP/Brand via Infra_LAB:

```bash
ansible-playbook site.yaml --tags authentik-bootstrap
# or: cd terraform/authentik && ./scripts/reconcile.sh dev
```
