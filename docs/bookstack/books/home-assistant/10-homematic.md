# Homematic

## Was Sie erreichen

Sie bedienen Homematic- bzw. Homematic-IP-Geräte über Home Assistant und wissen, was bei Funkproblemen oder Tasterfehlern zu tun ist.

## Was ist Homematic?

**Homematic** / **Homematic IP** (eq-3 / Homematic) ist ein verbreitetes Smart-Home-System in Deutschland — oft mit:

- Heizkörperthermostaten
- Fenster-/Türkontakten
- Wandtastern und Aktoren (Relais, Dimmer)
- Zentralen (CCU2/CCU3) oder Homematic-IP-Cloud/Access-Point

Home Assistant verbindet sich mit der Zentrale bzw. Integration; danach steuern Sie die Geräte in der **gleichen Übersicht** wie Zigbee- oder WLAN-Geräte.

Einrichtung der CCU/Integration: **Admin**.

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
- Doppelklick / Lange Druck: nur nutzen, wenn der Admin das erklärt hat

### Aktoren / Steckdosen / Licht

- Wie im Kapitel *Lichter & Schalter*: Karte tippen = an/aus

## Was Sie nicht selbst ändern sollten

- CCU-Weboberfläche, Firewall, Geräte-Firmware
- Geräte „anlernen“ / „abmelden“ ohne Admin
- Systemtasten an der Zentrale (Reset)

## Tipps

- Batterie an Thermostaten und Fensterkontakten bei Warnung wechseln
- Nach Batteriewechsel am Thermostat: kurz am Ventil prüfen, ob es wieder regelt; sonst Admin
- Homematic-Funk (je nach Variante) ist nicht WLAN — Reichweite hängt von Position und Wänden ab

## Wenn etwas nicht klappt

| Symptom | Was tun |
|---------|---------|
| Thermostat reagiert nicht | Batterie, Ventil fest? Warten; Admin (CCU) |
| Fensterkontakt falsch | Magnetlage prüfen; Admin |
| Gerät „nicht verfügbar“ | CCU/Access-Point online? Status-Seite; Admin |
| Taster schaltet lokal, HA nicht | Verbindung HA ↔ CCU — Admin |
| Zeiten / Programme stimmen nicht | Oft CCU- oder HA-Automation — Admin, nicht beides wild ändern |

## Hilfe

- Kapitel *Klima & Heizung* und *Szenen & Automationen*
- Ansprechpartner: Homelab-Admin
