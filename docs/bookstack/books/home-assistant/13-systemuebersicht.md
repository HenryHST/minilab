# Systemübersicht (Alltagsgeräte)

> Stand: 2026-10-17 · Instanz **HST-Home** (Home Assistant **2026.10.1**)

## Was Sie erreichen

Sie sehen die **wichtigsten Alltagsgeräte** sowie die **Zigbee-**, **Homematic-** und **Matter**-Gerätelisten — ohne die komplette Entity-Menge der Instanz (~6000 Entities, viele Sensoren/Netz-Internals).

## Kurzprofil

| Feld | Wert |
|------|------|
| URL | **https://ha02.stadthagen.dev** |
| Name | HST-Home |
| Version | 2026.10.1 |
| Zeitzone / Sprache | Europe/Berlin · de |
| Zigbee | Zigbee2MQTT (Bridge im Kontrollraum) |
| Homematic | Homematic(IP) Local / OpenCCU |
| Matter / Thread | Matter Server + OpenThread Border Router (SkyConnect) |

Bedienung der Oberfläche: Kapitel *Übersicht lesen*, *Lichter & Schalter*, *Klima & Heizung*. Technik-Hinweise: *Zigbee*, *Homematic*, *Matter*.

---

## Alltags-Entities (Auswahl)

Nur häufig genutzte Steuerungs- und Anzeige-Entities. `entity_id` hilft dem Admin bei Suche/Support.

### Personen

| Name | entity_id |
|------|-----------|
| Henry | `person.henryhst` |
| Marion | `person.marion` |
| Markus | `person.markus` |
| Connie | `person.connie` |

### Wohnzimmer

| Name | Typ | entity_id |
|------|-----|-----------|
| TV Licht | Licht | `light.tv_licht` |
| TV-WZ-Gruppe | Licht | `light.tv_wz_gruppe` |
| Strip-tv / Strip-li / Strip-re | Licht | `light.nl68_leuchte_4` u. a. |
| WZ Mitte Links / Rechts | Licht | `light.wz_mitte_links`, `light.wz_mitte_rechts` |
| Rollo-Mitte-Links / -Rechts | Rollo | `cover.neu`, `cover.test` |
| Rollo-RE-LI / Rollo-RE-RE | Rollo | `cover.rollo_re_li`, `cover.rollo_re_re` |
| WZ-Tür | Rollo/Tür | `cover.wz_tur` |
| Frame55 | TV | `media_player.tv_frame55` |
| Echo Wohnzimmer | Media | `media_player.wohnzimmer_echo_wohnzimmer` |
| musik-wz / atv-wz | Media | `media_player.musik_wz_stadthagen_dev`, `media_player.atv_wz_stadthagen_dev` |

### Schlafzimmer

| Name | Typ | entity_id |
|------|-----|-----------|
| Schranklampe | Licht | `light.schranklampe` |
| Strip-bett | Licht | `light.nl68_leuchte_3` |
| SZ-Tür / SZ-Fenster | Rollo | `cover.sz_tur`, `cover.sz_fenster` |
| atv-sz | Media | `media_player.atv_sz_stadthagen_dev` |

### Küche

| Name | Typ | entity_id |
|------|-----|-----------|
| Küchenlicht | Licht | `light.kuchenlicht` |
| Waschbeckenlicht | Licht | `light.waschbeckenlicht_white` / `_rgb` |
| Küche-LI / Küche-RE | Rollo | `cover.kuche_li`, `cover.kuche_re` |
| Kühlschrank | Klima | `climate.kuhlschrank` |
| musik-küche | Media | `media_player.musik_kuche_stadthagen_dev` |

### Eingangsflur / Bad / Gäste-WC / Balkon

| Name | Raum | Typ | entity_id |
|------|------|-----|-----------|
| Spot 1 / Spot 2 | Eingangsflur | Licht | `light.spot1`, `light.spot2` |
| Job | Eingangsflur | Licht | `light.job` |
| Mauslicht | Badezimmer | Licht | `light.mauslicht` |
| Spiegellicht | Gäste WC | Licht | `light.spiegellicht` |
| Balkonlicht03 | Balkon | Licht | `light.balkonlicht03` |
| Keylight | Arbeitszimmer | Licht | `light.elgato_bw26l1b03338` |

### Kameras (Hauptkanäle)

| Name | entity_id |
|------|-----------|
| Eingang | `camera.eingang` |
| Garage | `camera.garage` |
| Straße | `camera.strasse` |
| Straßenbahn | `camera.strassenbahn` |
| Parkplatz | `camera.parkplatz` |
| Dachboden | `camera.dachboden` |

(High-Resolution-Kanäle existieren zusätzlich — für Alltags-Dashboards meist die Basis-Kameras.)

---

## Zigbee-Geräte (Zigbee2MQTT)

Bridge: **Zigbee2MQTT Bridge** (Kontrollraum), Software **2.14.2** (Stand Abfrage 2026-10-19, Verbindung an). Installation, Rollen und Automationen: Kapitel *Zigbee*.

Unten die **Geräte** (nicht jede Hilfs-Entity wie Linkqualität). Namen ohne Area stehen am Ende.

### Wohnzimmer

| Gerät | Hersteller | Modell / Typ |
|-------|------------|--------------|
| TV Licht | Philips | Hue LightStrip |
| TV-WZ-Gruppe | Zigbee2MQTT | Gruppe |
| WZ-TV / WZ-TV-SW / WZ-TV-Box | IKEA | ASKVADER / TRADFRI |
| AV Verstärker, Sub2 | IKEA | ASKVADER |
| Stern, Fitness, Plug3 | NEO / BSEED / OSRAM | Steckdose / Plug |
| WZM-/WZR-/WZL-Wasser | IKEA | Wassermelder |
| RM-WZ | Aqara | Rauchmelder |
| Wassermelder WZ-RE / WZ-Mi | Aqara | Leckage |

### Schlafzimmer

| Gerät | Hersteller | Modell / Typ |
|-------|------------|--------------|
| Schranklampe | Philips | Hue Bloom |
| TV Schlafzimmer, Schranklicht | SONOFF / IKEA | Switch |
| Dimmer Schlafzimmer, Schalter-SZ | Tuya / SONOFF | Knopf / Button |
| Nachttisch | OSRAM | Smart+ plug |
| SZ-Tür, SZ-Fenster | Shelly | 2PM Cover |
| RM-SZ | Aqara | Rauchmelder |
| Schlafzimmer | Zigbee2MQTT | Gruppe |

### Küche

| Gerät | Hersteller | Modell / Typ |
|-------|------------|--------------|
| Küchenlicht | OSRAM | LIGHTIFY GU10 |
| Waschbeckenlicht | Dresden Elektronik | Ballast |
| Schalter Küche, Küche-SW | IKEA / SONOFF | TRADFRI / Button |
| Jura, Spülmaschine | Innr / IKEA | Smart plug |
| Küche-LI, Küche-RE | Shelly | 2PM Cover |

### Eingangsflur / Bad / Gäste-WC / Balkon / Garage-nah

| Gerät | Raum | Typ |
|-------|------|-----|
| Spot1, Spot2 | Eingangsflur | Hue GU10 |
| Flur (Sensor), Flurlampe, Job | Eingangsflur | Temp / Switch / Nachtlicht |
| Mauslicht, Maus Schalter | Badezimmer | Hue Strip / Button |
| BR-Wasser, WM-H2O, BL-Wasser, BZ-Temp | Badezimmer | Wasser / Temp |
| Spiegellicht, GästeLicht | Gäste WC | Hue / SONOFF |
| Balkonlicht03, PV Plug, Garagentor | Balkon | Licht / Plug / Vibration |
| Straße / Outdoor | — | siehe Out-Door, Balkonlampen |

### Arbeitszimmer / Serverschrank

| Gerät | Typ |
|-------|-----|
| Drehknopf, Schalter AZ | Knopf / Hue Dimmer |
| Schreibtisch Marion, Monitor Arbeit/Privat | ASKVADER |
| Modem | Smart plug |
| AZL-Wasser | Wassermelder |
| Serverschrank | Aqara Temp/Feuchte |

### Weitere Zigbee (ohne Raum oder Infrastruktur)

| Gerät | Typ |
|-------|-----|
| Zigbee2MQTT Bridge | Bridge |
| Waschmaschine, Tom, Switch3, Couch, Hifi-Power, BP-Power | Plugs / Mehrfach |
| SZ-Deckenlicht, AZ-Deckenlicht, Balkonlampen, GInfra, Garagenlicht | SONOFF / Shelly |
| WZ-Shelly1, Out-Door | Licht / LED-Controller |
| m4, m5, 0x7c2c67… | Shelly Mini (ggf. umbenennen) |

---

## Homematic-Geräte (Homematic IP Local)

> Stand Abfrage: **2026-10-17** · 14 Geräte · Integration **homematicip_local** (Eintrag `e886462b-openccu`, geladen) · App **OpenCCU** `e886462b_openccu` v3.89.11.20260919 (gestartet)

Installation, Rollen und Automationen: Kapitel *Homematic*.

| Gerät | Modell | Raum | Rolle |
|-------|--------|------|-------|
| e886462b-openccu | OpenCCU | Kontrollraum | Zentrale |
| HmIP-RFUSB 000425A98C6FFE | HmIP-RFUSB | Arbeitszimmer | Funk-Stick |
| HmIP-RCV-50 HmIP-RCV-1 | HmIP-RCV-50 | — | Virtueller Empfänger (HmIP) |
| HM-RCV-50 BidCoS-RF | HM-RCV-50 | — | Virtueller Empfänger (BidCoS) |
| Klingel | HmIP-DSD-PCB | Flur | Klingel |
| Flurtaster | HMIP-WRC2 | Eingangsflur | Wandtaster |
| Rollo-Mitte-Links | HmIP-HDM1 | Wohnzimmer | Rollladen (`cover.neu`) |
| Rollo-Mitte-Rechts | HmIP-HDM1 | Wohnzimmer | Rollladen (`cover.test`) |
| Rollo-RE-LI | HmIP-HDM1 | Wohnzimmer | Rollladen |
| Rollo-RE-RE | HmIP-HDM1 | Wohnzimmer | Rollladen |
| Balkon-Tür-WZ | HmIP-SWDO-I | Wohnzimmer | Türkontakt |
| AZ-Fenster-klein | HMIP-SWDO | Arbeitszimmer | Fensterkontakt |
| Temp-Balkon | HmIP-STHO | Balkon | Außen-Temp/Feuchte |
| Kühlschrank | HmIP-WTH-2 | Küche | Wandthermostat |

---

## Matter-Geräte

> Stand Abfrage: **2026-10-17** · 9 Geräte · Integration **Matter** (geladen) · Apps **Matter Server** `core_matter_server` v9.2.0 · **OTBR** `core_openthread_border_router` v3.3.0 (beide gestartet)

Installation, App-Konfig und Automationen: Kapitel *Matter*.

| Gerät (Anzeige) | Hersteller | Modell | Raum | Rolle |
|-----------------|------------|--------|------|-------|
| Strip-li | Nanoleaf | NL68 | Wohnzimmer | LED-Strip |
| Strip-re | Nanoleaf | NL68 | Wohnzimmer | LED-Strip |
| Strip-tv | Nanoleaf | NL68 | Wohnzimmer | LED-Strip |
| Strip-bett | Nanoleaf | NL68 | Schlafzimmer | LED-Strip |
| AZ-Temp / AZ-Feucht | IKEA | TIMMERFLOTTE | Arbeitszimmer | Temp/Feuchte |
| Flur-Temp / Flur-Feucht | IKEA | TIMMERFLOTTE | Eingangsflur | Temp/Feuchte |
| Küche-Temp / Küche-Feucht | IKEA | TIMMERFLOTTE | Küche | Temp/Feuchte |
| AIR-WZ | IKEA | ALPSTUGA | Wohnzimmer | Luftqualität |
| AIR-SZ | IKEA | ALPSTUGA | Schlafzimmer | Luftqualität |

---

## Weiterführend

| Thema | Kapitel |
|-------|---------|
| Dashboard & Statusfarben | *Übersicht lesen* |
| Licht / Steckdose tippen | *Lichter & Schalter* |
| Zigbee-Bedienung & Pairing | *Zigbee* |
| Homematic-Bedienung | *Homematic* |
| Matter / Thread | *Matter* |
| Störungen | *Wenn etwas nicht klappt* |
| Admin / Host ha02 | Ops-Doku `ha02.md` (minilab) |

Liste bei größeren Umbauten aktualisieren (Admin, Live-Abfrage aus Home Assistant).
