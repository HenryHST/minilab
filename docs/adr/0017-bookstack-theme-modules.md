# ADR-0017: BookStack Theme Modules statt Plugins

- **Status:** Accepted
- **Datum:** 2026-09-14
- **Kontext:** `apps/bookstack/`, BookStack ≥ v26.03

## Kontext

Für BookStack gibt es kein offizielles Plugin-Ökosystem wie bei vielen CMS. Ab v26.03 existieren **Theme System Modules** (portable Hacks), installierbar per Artisan-Befehl.

## Entscheidung

- Keine Drittanbieter-„Plugin“-Forks der BookStack-Core-App.
- Nützliche Erweiterungen als **Theme Modules** dokumentieren und bei Bedarf manuell im laufenden Pod (persistentes Volume) installieren.
- Startset (Vorschlag): Header-Anker, PDF-Embed, Sticky-Tabellenköpfe, Wortzahl/Lesezeit, TOC im Editor, Attachments in neuem Tab (Quellen: [bookstackapp.com/hacks](https://www.bookstackapp.com/hacks/), Community-Header-Hacks).
- Module sind **unsupported** durch BookStack-Upstream — nach Image-Upgrades testen.

## Konsequenzen

- Image-Tag bewusst ≥ v26.05 (Theme Modules).
- Modul-Install ist kein GitOps-Objekt (Dateien im Volume); Upgrade-Runbook im App-README.
- Bei Konflikten Module entfernen bzw. Theme zurücksetzen, App bleibt nutzbar.
