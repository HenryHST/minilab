# Authentik (nXk3 IdP)

GitOps install for `idp.stadthagen.dev`. Day-0 blueprints: [BLUEPRINTS.md](BLUEPRINTS.md).

## Helm (vendored + rendered)

Avoids Argo CD `kustomize --enable-helm` / `helm pull` races (`charts/... already exists`).

```bash
# bump chart version, then:
helm pull authentik --repo https://charts.goauthentik.io --version 2026.8.3 --untar --untardir charts
helm dependency update charts/authentik
helm template authentik ./charts/authentik \
  -f values.yaml --namespace authentik --include-crds \
  > helm-manifest.yaml
```

IdP config (OAuth/LDAP/Brand) stays in Infra_LAB OpenTofu / `--tags authentik-bootstrap`.
