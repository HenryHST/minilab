# Authentik / SSO

Authentik ist das zentrale IdP (`https://idp.stadthagen.dev`).

## Bootstrap-Admin (Anmelde-Passwort)

Erstes Admin-Login über SecretSpec `AUTHENTIK_BOOTSTRAP_EMAIL` / `AUTHENTIK_BOOTSTRAP_PASSWORD` (User oft `akadmin`). Quelle und Spiegel: Infra_LAB `ansible/playbooks/k3s_cluster/secrets/`.

**SecretSpec:**

```bash
cd ansible/playbooks/k3s_cluster/secrets
secretspec get AUTHENTIK_BOOTSTRAP_PASSWORD --profile cluster
secretspec get AUTHENTIK_BOOTSTRAP_EMAIL --profile cluster
```

**Kubernetes (nach Ansible `--tags secrets`):**

```bash
kubectl -n authentik get secret authentik-credentials \
  -o jsonpath='{.data.AUTHENTIK_BOOTSTRAP_PASSWORD}' | base64 -d; echo
kubectl -n authentik get secret authentik-credentials \
  -o jsonpath='{.data.AUTHENTIK_BOOTSTRAP_EMAIL}' | base64 -d; echo
```

## Integrierte Apps (Beispiele)

- Termix, Vaultwarden, Grafana, Headlamp, **BookStack**
- Client-Secrets liegen **nicht** in Git (SecretSpecs / Ansible)

## BookStack

- Methode: OIDC
- Issuer: `https://idp.stadthagen.dev/application/o/bookstack/`
- Redirect: `https://book.stadthagen.dev/oidc/callback`
- Gruppen → BookStack-Rollen (optional): z. B. `BookStack Admin`, `BookStack Editor`

Details: ADR-0010, App-README `apps/bookstack/README.md`.
