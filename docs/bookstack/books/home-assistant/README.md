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
| 15 | [`15-geraeteuebersicht.md`](15-geraeteuebersicht.md) | Geräteübersicht (Index + TOC) |
| 16 | [`16-wohnzimmer.md`](16-wohnzimmer.md) | Wohnzimmer |
| 17 | [`17-schlafzimmer.md`](17-schlafzimmer.md) | Schlafzimmer |
| 18 | [`18-kueche.md`](18-kueche.md) | Küche |
| 19 | [`19-eingangsflur.md`](19-eingangsflur.md) | Eingangsflur |
| 20 | [`20-flur.md`](20-flur.md) | Flur |
| 21 | [`21-badezimmer.md`](21-badezimmer.md) | Badezimmer |
| 22 | [`22-gaeste-wc.md`](22-gaeste-wc.md) | Gäste WC |
| 23 | [`23-balkon.md`](23-balkon.md) | Balkon |
| 24 | [`24-arbeitszimmer.md`](24-arbeitszimmer.md) | Arbeitszimmer |
| 25 | [`25-serverschrank.md`](25-serverschrank.md) | Serverschrank |

Ops-/Architektur (Admin): [`../../../home-assistant/ha02.md`](../../../home-assistant/ha02.md).

## Changelog

### 1.9.0 — 2026-10-21

- **Produktbilder** lokal unter `media/devices/` (128px-PNG-Thumbnails); Tabellen 15–25 auf relative Pfade umgestellt (BookStack-Gallery-Import). Fehlende CDN-URLs ersetzt; zuvor bildlose Geräte ergänzt (außer WZ-Rollo/BTHome)

### 1.8.0 — 2026-10-19

- **Geräteübersicht** aufgeteilt: Index mit Inhaltsverzeichnis; eigene Seiten pro Zimmer (16–25); „Ohne Raum“ bleibt auf dem Index

### 1.7.0 — 2026-10-19

- Kapitel **Geräteübersicht**: Bluetooth-Endgeräte ergänzt (WZ-Rollo / BTHome); Proxies weiterhin ausgeschlossen (~93 Endgeräte)

### 1.6.0 — 2026-10-19

- Kapitel **Geräteübersicht**: pro Raum Hardware-Tabellen (Zigbee/Homematic/Matter), Spalten inkl. Gerätetyp, Produktbild-URL, Stromversorgung, Batterieformfaktor (~92 Endgeräte)

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
