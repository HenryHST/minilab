# ADR-0036: Argo CD Image Updater (Git write-back + Lab-Registry)

- **Status:** Accepted
- **Datum:** 2026-10-09
- **Kontext:** `apps/ops/argocd-image-updater/`, `apps/dev/registry-demo/`, Companion zu Infra_LAB [ADR-0025](https://github.com/HenryHST/Infra_LAB/blob/main/docs/adr/0025-argocd-image-updater-git-writeback.md)

## Kontext

Image-Pins lagen nur in Git (manuell/Renovate). Die Lab-Registry (`registry.stadthagen.dev`) speichert Images, ohne automatische Promotion. Classic Image Updater braucht Helm oder Kustomize; [ADR-0003](0003-plain-directory-kein-kustomize.md) verbietet `kustomization.yaml` im Sync-Pfad.

## Entscheidung

1. **argocd-image-updater** als Helm-App im AppSet `ops` (Chart **1.3.1**, Namespace `argocd`, Sync-Wave `1`).
2. Updates über **`ImageUpdater` CR** (Controller v1.x), nicht flächendeckende Application-Annotations.
3. Write-back: **`git`** mit Secret `argocd-image-updater-git` (Infra_LAB SecretSpec `ARGOCD_IMAGE_UPDATER_GIT_TOKEN`) nach `HenryHST/minilab`.
4. Registry-Config: Prefix `registry.stadthagen.dev`.
5. Pilot **`registry-demo`**: lokales Helm-Chart (`localHelm` im AppSet `dev`), Write-back-Ziel `helmvalues:/apps/dev/registry-demo/values.yaml`. Allowlist nur diese App.
6. Öffentliche Upstream-Images bleiben bei Renovate; Image Updater nur für Lab-Registry-Images.

## Konsequenzen

- AppProject `ops` darf nach Namespace `argocd` deployen; `dev` nach `registry-demo`.
- Vor dem ersten healthy Sync muss das Pilot-Image in die Lab-Registry gespiegelt werden (`crane copy …`).
- Ohne Git-Token schlägt Write-back fehl; Controller kann trotzdem laufen.
- Später: weitere Apps per zusätzlicher `applicationRefs` / CRs, nicht global.
- Harbor bleibt optionaler Nachfolger der Distribution-Registry (Prefix/Credentials umstellen).
