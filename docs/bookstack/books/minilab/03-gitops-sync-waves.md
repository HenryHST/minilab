# Sync Waves & GitOps

## Prinzip

Argo CD Parent-App `homelab` synct Child-Applications aus `apps/argocd-apps/`. Infrastruktur kommt über ApplicationSet `infra`.

**Wichtig:** `targetRevision: main` (nicht `HEAD`).

## Sync Waves (Kurz)

| Wave | Inhalt |
|------|--------|
| -2 / 0 | AppProject + ApplicationSet Bootstrap |
| 1 | Storage / Monitoring-Basis |
| 2 | Authentik, Termix, Headlamp, … |
| 3 | Tools, Vaultwarden, BookStack, Homepage, … |

## Neue User-App

1. Ordner `apps/<name>/` mit Plain YAML (kein `kustomization.yaml`)
2. Helm: Chart rendern → `helm-manifest.yaml` committen
3. Application in `apps/argocd-apps/<name>.yaml`
4. Push auf `main` → Parent synct automatisch

Siehe ADRs 0002–0007 und 0014 im Git-Repo.
