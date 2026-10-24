# Troubleshooting (Kurz)

> **Buch** v1.2.1 · Stand: 2026-10-24

## Trivy / CVE auf Helper-Images

Jobs melden noch `alpine/k8s`, `:1.0.0` oder alte CNPG-Tags → Manifeste auf **`k8s-toolbox:1.0.1`** (amd64+arm64, Forgejo + `registry.stadthagen.dev`) bzw. dated CNPG-`standard-bookworm`-Tags prüfen. cert-manager Findings zu **CVE-2026-84304**: Chart-Pin **v1.21.2**.

Go-Findings (`stdlib` / `x/net`) in Backup-/Restore-Jobs trotz `1.0.1`: Image enthält weiterhin kubectl **v1.37.1** — kubectl-Bump im Repo `ops/k8s-toolbox` (Forgejo), nicht nur Tag-Wechsel. Paperless-App-/Gotenberg-HIGHs: Buch **Paperless** → [Trivy & CVE-Hygiene](../../paperless/06-trivy-cve-hygiene.md).

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
