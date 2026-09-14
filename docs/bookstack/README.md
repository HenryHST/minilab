# BookStack-Inhalte (Git ↔ BookStack)

Dieses Verzeichnis ist die **Git-Seite** der Dokumentation. Live-Bücher liegen nach dem Deploy in BookStack (`https://book.stadthagen.dev`). Beide Pfade sollen inhaltlich synchron gehalten werden.

## Struktur

| Pfad | BookStack-Ziel |
|------|----------------|
| [`templates/`](templates/) | Seiten-Vorlagen (Page Templates) |
| [`books/minilab/`](books/minilab/) | Buch **Minilab** — Plattform-/Ops-Doku (Spiegel von README + ADRs) |
| [`books/anleitungen/`](books/anleitungen/) | Allgemeine **Nicht-IT**-Step-by-Step-Anleitungen |
| [`books/home-assistant/`](books/home-assistant/) | Buch **Home Assistant** — Bedienung für Nicht-IT (`ha02.stadthagen.dev`); Ops: [`../home-assistant/ha02.md`](../home-assistant/ha02.md) |
| [`IMPORT.md`](IMPORT.md) | Import-Reihenfolge und Checkliste |

## Pflege-Regel

1. Plattform-Wahrheit (Manifeste, Wellen, Secrets) bleibt in Git (`README.md`, `docs/adr/`, App-READMEs).
2. Lesbare Narration und Screenshots für Endnutzer → BookStack; Markdown-Quellen hier aktualisieren.
3. Nach größeren Git-Änderungen: betroffene BookStack-Seiten anpassen (manuell oder API — siehe IMPORT.md).
