# ADR-0002: GitOps mit Argo CD App-of-Apps

- **Status:** Accepted
- **Datum:** 2026-09-11
- **Kontext:** `apps/argocd-apps/`, Parent-App `homelab` (Infra_LAB / Ansible)

## Kontext

Cluster-Workloads sollen deklarativ, reviewbar und wiederherstellbar sein. Manuelles `kubectl apply` skaliert nicht und driftet schnell. Ansible soll nur den Einstieg (Parent-App) legen, nicht jede Child-App verwalten.

## Entscheidung

- **Single Source of Truth:** dieses Repo (`HenryHST/minilab`).
- Ansible legt nur die Parent-Application `homelab` an.
- Child-Applications und Bootstrap liegen unter [`apps/argocd-apps/`](../../apps/argocd-apps/).
- User-Apps: Manifeste in `apps/<name>/`, Application-CR in `apps/argocd-apps/<name>.yaml`.
- Infrastruktur: siehe [ADR-0004](0004-applicationset-infra.md).

Langfristig: Verlagerung des Argo-Bootstraps nach `infra/argocd/` (Homelab-Pattern), aktuell bewusst noch `apps/argocd-apps/`.

## Konsequenzen

- Änderungen an Apps laufen über Git + Argo Sync (PR-Flow).
- Cluster-Secrets bleiben außerhalb Git (Ansible `--tags secrets` / SecretSpecs).
- Parent `homelab` muss korrekt revisioniert sein ([ADR-0005](0005-target-revision-main.md)).
