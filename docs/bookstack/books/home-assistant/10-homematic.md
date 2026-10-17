# Homematic

## Was Sie erreichen

Sie wissen, was bei uns installiert ist (OpenCCU, Integration, Funk), welche Homematic-Geräte es gibt, welche Automationen sie nutzen — und wie Sie die Geräte bedienen bzw. bei Störungen vorgehen.

## Was ist Homematic?

**Homematic** / **Homematic IP** (eQ-3) ist ein verbreitetes Smart-Home-System in Deutschland — oft mit:

- Heizkörper-/Wandthermostaten
- Fenster-/Türkontakten
- Wandtastern und Aktoren (Relais, Rollladenantriebe)
- Zentralen (CCU) statt Cloud

Home Assistant verbindet sich mit unserer Zentrale; danach steuern Sie die Geräte in der **gleichen Übersicht** wie Zigbee- oder WLAN-Geräte.

---

## Was ist installiert (Admin)

> Kurzüberblick für Support. Einrichtung und Firmware nur durch Admin.

| Baustein | Was | Stand (2026-10-17) |
|----------|-----|---------------------|
| **OpenCCU** (HA-App) | Homematic-/Homematic-IP-Zentrale als Add-on auf ha02 | Slug `e886462b_openccu`, Version **3.89.11.20260919**, Status *gestartet*, Auto-Update an |
| **Integration** | **Homematic(IP) Local** (`homematicip_local`) an die OpenCCU | Aktiver Eintrag **e886462b-openccu** (geladen). Alter Eintrag `openccu/192.168.0.55` ist *nicht geladen* und kann vom Admin bereinigt werden |
| **Funk-Stick** | **HmIP-RFUSB** am Host / an der CCU | Gerät im Raum *Arbeitszimmer* |
| **Funkprotokolle** | **HmIP-RF** (Homematic IP) und **BidCoS-RF** (klassisch Homematic) | Virtuelle Empfänger `HmIP-RCV-50` und `HM-RCV-50 BidCoS-RF` erscheinen als Geräte |

**Kurz erklärt:** OpenCCU ist die „Zentrale“ (wie eine CCU3). Die Integration holt Geräte und Sensoren nach Home Assistant. Der RFUSB sendet und empfängt Funk; HmIP und BidCoS sind zwei Funkwelten — bei uns laufen beide über dieselbe OpenCCU.

Anlernen neuer Geräte, CCU-WebUI und Firmware: **nur Admin**.

---

## Geräteübersicht

Vollständige Tabelle inkl. Modell und Raum: Kapitel *Systemübersicht* (Abschnitt Homematic).

Rollen auf einen Blick:

| Rolle | Geräte (Namen in HA) |
|-------|----------------------|
| Zentrale | `e886462b-openccu` (OpenCCU, Kontrollraum) |
| Funk | HmIP-RFUSB; virtuelle Empfänger HmIP-RCV / BidCoS-RF |
| Wandtaster | **Flurtaster** (HMIP-WRC2, Eingangsflur) |
| Rollläden | **Rollo-Mitte-Links / -Rechts**, **Rollo-RE-LI / Rollo-RE-RE** (HmIP-HDM1, Wohnzimmer) |
| Kontakte | **Balkon-Tür-WZ** (Wohnzimmer), **AZ-Fenster-klein** (Arbeitszimmer) |
| Klima / Sensor | **Kühlschrank** (HmIP-WTH-2 Wandthermostat, Küche), **Temp-Balkon** (HmIP-STHO, Balkon) |
| Klingel | **Klingel** (HmIP-DSD-PCB, Flur) |

> Hinweis Admin: Die Cover-Entities der beiden mittleren Rollos heißen historisch `cover.neu` (Mitte-Links) und `cover.test` (Mitte-Rechts) — Anzeigenamen in der UI sind korrekt.

---

## Automationen mit Homematic

Nur Automationen in Home Assistant, die Homematic-Entities **auslösen** oder **steuern**. CCU-interne Programme sind hier nicht dokumentiert.

| Automation | Auslöser | Wirkung | Homematic-Bezug |
|------------|----------|---------|-----------------|
| **Klingel2HA** | Klingel-Event `ring` (`event.hmip_dsd_pcb_…`) | Push auf Handys, Alexa-Türklingelton, Küchen-Skript, Shelly-Ausgang, AWTRIX-Text | Gerät **Klingel** |
| **Rollo-WZ auf** | Zigbee-Wandtaster Wohnzimmer, Taste 2 | Öffnet die Homematic-Rollos Mitte-Links, Mitte-Rechts und RE-LI | Cover-Geräte HmIP-HDM1 |
| **Rollo-WZ zu** | Zigbee-Wandtaster Wohnzimmer, Taste 3 | Setzt Positionen der vier Wohnzimmer-Rollos (teilweise geschlossen) | Cover-Geräte HmIP-HDM1 |

**Flurtaster:** in HA als Gerät und Events (`event.flurtaster_ch1` / `_ch2`) sichtbar; derzeit **keine** eigene HA-Automation daran gebunden (lokale/CCU-Nutzung oder künftige Erweiterung).

Allgemeine Bedienung von Szenen/Automationen: Kapitel *Szenen & Automationen*.

---

## Was Sie brauchen

- Angemeldet unter **https://ha02.stadthagen.dev**
- Homematic-Gerät, das bereits in Home Assistant sichtbar ist

## Typische Bedienung

### Heizung / Thermostat

1. Thermostat-Karte im Raum öffnen
2. Solltemperatur einstellen (siehe Kapitel *Klima & Heizung*)
3. Fensterkontakt offen → Heizung kann automatisch absenken (wenn Automation aktiv)

### Taster an der Wand

- Physischer Taster schaltet oft **direkt** den Aktor (auch ohne App)
- In Home Assistant sehen Sie den Zustand und können zusätzlich tippen
- Doppelklick / Langer Druck: nur nutzen, wenn der Admin das erklärt hat
- Wohnzimmer-Rollos „auf/zu“: über den Zigbee-Taster (Automationen oben) oder die Rollo-Karten im Dashboard

### Aktoren / Steckdosen / Licht / Rollo

- Wie im Kapitel *Lichter & Schalter*: Karte tippen = an/aus bzw. Rollo öffnen/schließen/Position

## Was Sie nicht selbst ändern sollten

- CCU-Weboberfläche (OpenCCU), Firewall, Geräte-Firmware
- Geräte „anlernen“ / „abmelden“ ohne Admin
- Systemtasten an der Zentrale (Reset)
- Beide Automationen und CCU-Programme parallel „wild“ umbauen

## Tipps

- Batterie an Thermostaten und Fensterkontakten bei Warnung wechseln
- Nach Batteriewechsel am Thermostat: kurz am Ventil prüfen, ob es wieder regelt; sonst Admin
- Homematic-Funk ist nicht WLAN — Reichweite hängt von Position und Wänden ab
- Duty-Cycle / Servicemeldungen der OpenCCU: bei Auffälligkeiten Admin (Sensoren `…_sv_dutycycle`, `…_servicemeldungen`)

## Wenn etwas nicht klappt

| Symptom | Was tun |
|---------|---------|
| Thermostat reagiert nicht | Batterie, Ventil fest? Warten; Admin (OpenCCU) |
| Fensterkontakt falsch | Magnetlage prüfen; Admin |
| Gerät „nicht verfügbar“ | OpenCCU-App gestartet? Integration geladen? Status-Seite; Admin |
| Taster schaltet lokal, HA nicht | Verbindung HA ↔ OpenCCU — Admin |
| Klingel ohne Push/Alexa | Automation **Klingel2HA** an? Admin |
| Rollos reagieren nicht auf WZ-Taster | Automationen **Rollo-WZ auf/zu**; sonst Rollo-Karte im Dashboard testen |
| Zeiten / Programme stimmen nicht | Oft CCU- oder HA-Automation — Admin, nicht beides wild ändern |

## Geräteliste

Aktuelle Homematic(IP)-Local-Geräte (OpenCCU): Kapitel *Systemübersicht*.

## Hilfe

- Kapitel *Klima & Heizung*, *Szenen & Automationen*, *Systemübersicht*
- Ansprechpartner: Homelab-Admin
