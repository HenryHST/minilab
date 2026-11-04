# Vaultwarden (nXk3)

Bitwarden-kompatibler Passwort-Safe. Authentik-OIDC, kanonischer Host `vw-ext.stadthagen.dev`.

| | |
|--|--|
| Chart | `charts/vaultwarden` Fork `1.4.2+minilab.1` (gissilabs 1.4.2) |
| Manifest | `helm-manifest.yaml` (ADR-0014) |
| Image | `vaultwarden/server:1.37.5` |
| Secrets | `vaultwarden-oauth`, `vaultwarden-admin`, `vaultwarden-smtp` (Infra_LAB) |

## Regenerieren

```bash
helm template vaultwarden ./charts/vaultwarden \
  -f values.yaml --namespace vaultwarden --skip-tests > helm-manifest.yaml
```

Extras (IngressRoute, Backup, Restore-UI, NetworkPolicy, Certificate) bleiben Plain YAML neben dem Manifest.

## Doku

BookStack-Buch **Vaultwarden** (minilab): Übersicht, [Helm & GitOps](../../../docs/bookstack/books/vaultwarden/05-helm-gitops.md), [SMTP & Emergency Access](../../../docs/bookstack/books/vaultwarden/09-smtp-emergency.md).
