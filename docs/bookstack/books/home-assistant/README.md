# Buch: Home Assistant (Step-by-Step)

Zielgruppe: **Nicht-IT** / Haushaltsnutzer. Instanz: **https://ha02.stadthagen.dev**

BookStack: Shelf **Anleitungen** → Buch **Home Assistant**. Kapitel in dieser Reihenfolge importieren:

| # | Datei | Seitentitel (Vorschlag) |
|---|--------|-------------------------|
| 1 | [`00-voraussetzungen.md`](00-voraussetzungen.md) | Voraussetzungen |
| 2 | [`01-ueberblick.md`](01-ueberblick.md) | Überblick |
| 3 | [`02-anmelden-app.md`](02-anmelden-app.md) | Anmelden & App |
| 4 | [`03-uebersicht-lesen.md`](03-uebersicht-lesen.md) | Übersicht lesen |
| 5 | [`04-lichter-schalter.md`](04-lichter-schalter.md) | Lichter & Schalter |
| 6 | [`05-klima-heizung.md`](05-klima-heizung.md) | Klima & Heizung |
| 7 | [`06-szenen-automationen.md`](06-szenen-automationen.md) | Szenen & Automationen |
| 8 | [`08-zigbee.md`](08-zigbee.md) | Zigbee (Z2M, Rollen, Automationen) |
| 9 | [`09-matter.md`](09-matter.md) | Matter |
| 10 | [`10-homematic.md`](10-homematic.md) | Homematic |
| 11 | [`11-bluetooth.md`](11-bluetooth.md) | Bluetooth |
| 12 | [`12-stoerungen.md`](12-stoerungen.md) | Wenn etwas nicht klappt |
| 13 | [`13-systemuebersicht.md`](13-systemuebersicht.md) | Systemübersicht |
| 14 | [`14-dashboard-home.md`](14-dashboard-home.md) | Dashboard Home |

Ops-/Architektur (Admin): [`../../../home-assistant/ha02.md`](../../../home-assistant/ha02.md).

## Changelog

### 1.5.0 — 2026-10-19

- Kapitel **Zigbee**: Homematic-Parität — Zigbee2MQTT-Stack (Bridge 2.14.2, Coordinator), Geräte-Rollen, HA-Automationen (WZ-Rollo-Taster, Mauslicht, Küchenlicht)

### 1.4.0 — 2026-10-17

- Kapitel **Matter**: Matter Server & OTBR inkl. App-Konfig, Integrationen Matter/Thread, Geräte-Rollen, Automation Neustart Border Router
- Kapitel **Systemübersicht**: Matter-Gerätetabelle (9 Geräte) ergänzt

### 1.3.0 — 2026-10-17

- Kapitel **Homematic**: OpenCCU-App, Integration `homematicip_local`, Funk (HmIP/BidCoS), Rollen-Übersicht, HA-Automationen (Klingel2HA, Rollo-WZ auf/zu)
- Kapitel **Systemübersicht**: Homematic-Gerätetabelle aus Live-Abfrage aktualisiert (14 Geräte)

### 1.2.0 — 2026-10-17

- Kapitel **Dashboard Home**: alle Tabs des Dashboards `dashboard-home` inkl. Screenshots unter `media/dashboard-home/`

### 1.1.0 — 2026-10-17

- Kapitel **Systemübersicht**: Alltags-Entities (Auswahl), Zigbee2MQTT- und Homematic(IP)-Local-Gerätelisten

Vorlage: [`../../templates/vorlage-anleitung-nicht-it.md`](../../templates/vorlage-anleitung-nicht-it.md). Screenshots später in BookStack ergänzen.

## E-Mail bei Änderungen

Neue Version / Update per Mail: siehe [`BENACHRICHTIGUNGEN.md`](BENACHRICHTIGUNGEN.md)

- **BookStack Watch** → Live-Edits im Wiki
- **GitHub Action** → Push auf `main` in diesem Ordner (Empfänger: [`recipients.yaml`](recipients.yaml))
