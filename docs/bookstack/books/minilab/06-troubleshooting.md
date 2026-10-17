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

## BookStack PDF-Export

UI-PDF bricht ab, Timeout ~30 s, Font-Fehler oder „Keine Zugriffsberechtigung“ trotz sichtbarer Seite → Buch **BookStack**, Kapitel **PDF-Export Fehleranalyse** (FPM `www2.conf`, Fonts `abc`, Rolle `content-export`).

## Backup schlägt fehl

- NFS-Mount / Ordner auf NAS vorhanden?
- Pod-Labels für `kubectl exec` stimmen noch?
