# Troubleshooting (Kurz)

## App synct nicht / OutOfSync

- Argo CD UI prüfen; `argocd app sync <name>`
- Bei ApplicationSet: Hard-Refresh der ApplicationSet-Annotation

## CMP / `:8081` Fehler

Kein `kustomization.yaml` in App-Pfaden — Plain Directory oder committed Helm-Manifest (ADR-0003 / 0014).

## TLS / Certificate pending

- cert-manager + ClusterIssuer `letsencrypt-prod`
- DNS-01 Hetzner; Host muss `*.stadthagen.dev` sein

## Login / OIDC

- Authentik erreichbar? `idp.stadthagen.dev`
- Redirect-URIs und Client-Secret prüfen
- BookStack: Secret `bookstack-oauth`, Issuer-URL mit trailing `/`

## Backup schlägt fehl

- NFS-Mount / Ordner auf NAS vorhanden?
- Pod-Labels für `kubectl exec` stimmen noch?
