# Diagrams (minilab)

Interaktive HTML-Diagramme und BookStack-Exports für die Plattform-Bücher.

| ID | Typ | HTML | Export | BookStack-Kapitel |
|--|--|--|--|--|
| `mosquitto-architektur` | architecture | [mosquitto-architektur.html](archify/mosquitto-architektur.html) | `archify/exports/mosquitto-architektur.png` | Mosquitto — Übersicht |
| `trivy-architektur` | architecture | [trivy-architektur.html](archify/trivy-architektur.html) | `archify/exports/trivy-architektur.png` | Trivy Operator — Übersicht |

## Archify

```bash
ARCHIFY="$HOME/.agents/skills/archify"
ROOT="$(git rev-parse --show-toplevel)/docs/diagrams/archify"

node "$ARCHIFY/bin/archify.mjs" finalize architecture "$ROOT/<id>.json" "$ROOT/<id>.html" --quality showcase --json
node "$ARCHIFY/bin/archify.mjs" visual-check "$ROOT/<id>.html" --json
```

PNG: Light-Capture `*.visual-check.1440x900.light.png` nach `archify/exports/<id>.png` kopieren. Visual-Check-Sidecars nicht committen.
