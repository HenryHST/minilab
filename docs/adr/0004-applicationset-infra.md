# ADR-0004: ApplicationSet für Infrastruktur-Apps

- **Status:** Accepted
- **Datum:** 2026-09-11
- **Kontext:** [`apps/argocd-apps/raw/infra-applicationset.yaml`](../../apps/argocd-apps/raw/infra-applicationset.yaml)

## Kontext

Viele Plattform-Apps unter `infra/*` (cert-manager, Longhorn, Monitoring, …) teilen dasselbe Muster: Namespace, Sync-Wave, optional Multi-Source (Helm + Git-Extras). Einzelne Application-CRs pro Infra-App waren wartungsintensiv und fehleranfällig.

## Entscheidung

- ApplicationSet **`infra`** mit **List-Generator** und **goTemplate** (`missingkey=error`).
- Pro Eintrag: `app`, `namespace`, `syncWave`, optional `helmRepo` / `helmChart` / `helmVersion` / `helmValuesFile`, optional `path` + `extras`.
- Optionale Template-Felder über `dig` lesen (nicht bare `.helmChart`), sonst kaputte Specs.
- goTemplate-Conditionals nur in `templatePatch` (mehrzeiliger String), nicht inline im `template`-Block.
- AppProject + ApplicationSet liegen in `apps/argocd-apps/raw/` und werden von Application `infra-applicationset` (project `default`) bereitgestellt.

User-Apps unter `apps/<name>/` bleiben bei klassischen Application-CRs in `apps/argocd-apps/`.

## Konsequenzen

- Neue Infra-App = Ordner + Listeneintrag im ApplicationSet.
- Migration von Standalone-Application → ApplicationSet kann Finalizer-Konflikte erzeugen (`Terminating` + recreate); Workload bleibt, Application-CR ggf. Finalizer patchen / orphan delete (siehe Root-README).
- `pangolin-publish` ist bewusst über das ApplicationSet registriert (project `infrastruktur`).
