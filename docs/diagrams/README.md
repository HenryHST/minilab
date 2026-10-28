# Diagrams (minilab)

Interaktive HTML-Diagramme und BookStack-Exports für die Plattform-Bücher.

| ID | Typ | HTML | Export | BookStack-Kapitel |
|--|--|--|--|--|
| `mosquitto-architektur` | architecture | [mosquitto-architektur.html](archify/mosquitto-architektur.html) | `archify/exports/mosquitto-architektur.png` | Mosquitto — Übersicht |
| `trivy-architektur` | architecture | [trivy-architektur.html](archify/trivy-architektur.html) | `archify/exports/trivy-architektur.png` | Trivy Operator — Overview (#91: Server + Grafana) |
| `kyverno-admission` | architecture | [kyverno-admission.html](archify/kyverno-admission.html) | `archify/exports/kyverno-admission.png` | Kyverno — Übersicht |
| `kyverno-gitops` | architecture | [kyverno-gitops.html](archify/kyverno-gitops.html) | `archify/exports/kyverno-gitops.png` | Kyverno — Architektur |
| `gatus-architektur` | architecture | [gatus-architektur.html](archify/gatus-architektur.html) | `archify/exports/gatus-architektur.png` | Gatus — Übersicht |
| `paperless-oidc-groups` | architecture | [paperless-oidc-groups.html](archify/paperless-oidc-groups.html) | `archify/exports/paperless-oidc-groups.png` | Paperless — OIDC-Gruppen |
| `paperless-groups-provision` | workflow | [paperless-groups-provision.html](archify/paperless-groups-provision.html) | `archify/exports/paperless-groups-provision.png` | Paperless — Gruppen-Provisionierung |
| `paperless-backup` | architecture | [paperless-backup.html](archify/paperless-backup.html) | `archify/exports/paperless-backup.png` | Paperless — Backup (Strategie C) |
| `paperless-restore-workflow` | workflow | [paperless-restore-workflow.html](archify/paperless-restore-workflow.html) | `archify/exports/paperless-restore-workflow.png` | Paperless — Restore-Workflow |
| `podcraft-incident-2026-10-26` | architecture | [podcraft-incident-2026-10-26.html](archify/podcraft-incident-2026-10-26.html) | `archify/exports/podcraft-incident-2026-10-26.png` | podcraft — Incident Missing / HA SSL |
| `podcraft-diagnose-2026-10-26` | workflow | [podcraft-diagnose-2026-10-26.html](archify/podcraft-diagnose-2026-10-26.html) | `archify/exports/podcraft-diagnose-2026-10-26.png` | podcraft — Diagnose & Remediation |
| `podcraft-timeline-2026-10-26` | timeline | [podcraft-timeline-2026-10-26.html](archify/podcraft-timeline-2026-10-26.html) | `archify/exports/podcraft-timeline-2026-10-26.png` | podcraft — Incident Timeline |
| `mosquitto-pvc-ldap-incident` | architecture | [mosquitto-pvc-ldap-incident.html](archify/mosquitto-pvc-ldap-incident.html) | `archify/exports/mosquitto-pvc-ldap-incident.png` | Mosquitto — Incident PVC + LDAP 2026-10-28 |
| `mosquitto-pvc-ldap-diagnose` | workflow | [mosquitto-pvc-ldap-diagnose.html](archify/mosquitto-pvc-ldap-diagnose.html) | `archify/exports/mosquitto-pvc-ldap-diagnose.png` | Mosquitto — Diagnose & Remediation 2026-10-28 |

## Archify

```bash
ARCHIFY="$HOME/.agents/skills/archify"
ROOT="$(git rev-parse --show-toplevel)/docs/diagrams/archify"

node "$ARCHIFY/bin/archify.mjs" finalize architecture "$ROOT/<id>.json" "$ROOT/<id>.html" --quality showcase --json
node "$ARCHIFY/bin/archify.mjs" visual-check "$ROOT/<id>.html" --json
```

PNG: Light-Capture `*.visual-check.1440x900.light.png` nach `archify/exports/<id>.png` kopieren. Visual-Check-Sidecars nicht committen.
