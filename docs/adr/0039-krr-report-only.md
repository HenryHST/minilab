# ADR-0039: KRR — report-only, kein Auto-Apply

- **Status:** Accepted
- **Datum:** 2026-11-06
- **Kontext:** Perun [KRR in production: five failure patterns](https://perun.au/insights/krr-production); nXk3 Prometheus 9d/2GB + NetPol `:9090`

## Kontext

Robusta KRR kann aus Prometheus-History CPU/Memory-Empfehlungen erzeugen. Perun beschreibt fünf Produktionsfallen (kurze History → OOM, Prometheus-Fail → Zero-Recs/BestEffort, System-NS, Auto-Apply ohne PDB, Burst unter P99). nXk3 hat knappe Proxmox-Worker, aber **kein** bestehendes Rightsizing-Tool jenseits metrics-server / Kromgo.

## Entscheidung

1. **Kein** Deploy von KRR, Robusta, VPA-auto oder Goldilocks im Default-Lab.
2. **Kein Auto-Apply** von Resource-Patches aus Empfehlungen.
3. Bei späterer Freigabe nur **report-only** CronJob im Namespace `monitoring` (NetPol), mit Namespace-Exclude, Coverage-/Zero-Rec-Gates; Lookback ≤ Retention; manuelles GitOps-Tuning.
4. Haltung und Rezept: Infra_LAB BookStack K3s [23-krr-rightsizing-stance](https://github.com/HenryHST/Infra_LAB/blob/main/docs/bookstack/books/k3s/23-krr-rightsizing-stance.md).

## Konsequenzen

- Keine zusätzliche Restart-/OOM-Fläche durch blinde Empfehlungen.
- Rightsizing bleibt manuell und incident-getrieben, bis ein Report-Workflow freigegeben ist.
- Retention/PVC nicht vorsorglich für 30d-Lookback vergrößern.
