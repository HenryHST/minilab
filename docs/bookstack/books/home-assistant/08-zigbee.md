# Zigbee

## Was Sie erreichen

Sie wissen, was bei uns installiert ist (Zigbee2MQTT, Bridge, Coordinator), welche Zigbee-Geräte es typischerweise gibt, welche Automationen sie nutzen — und wie Sie die Geräte bedienen bzw. bei Störungen vorgehen.

## Was ist Zigbee?

Zigbee ist eine **Funktechnik für smarte Geräte** (Lampen, Steckdosen, Sensoren, Taster, …). Die Geräte sprechen untereinander und mit einem **Coordinator-Stick** (Gateway).

Typische Merkmale:

- Kein WLAN am Gerät nötig
- Viele batteriebetriebene Sensoren
- Reichweite über „Mesh“: Geräte mit Netzstecker verstärken das Signal

Home Assistant sieht die Geräte danach in der **gleichen Übersicht** wie Homematic- oder WLAN-Geräte.

Bei uns läuft Zigbee **nur über Zigbee2MQTT** (nicht ZHA). Stick, Pairing und Zigbee2MQTT-WebUI: **nur Admin**.

---

## Was ist installiert (Admin)

> Kurzüberblick für Support. Einrichtung, Pairing und Firmware nur durch Admin.

| Baustein | Was | Stand (2026-10-19) |
|----------|-----|---------------------|
| **Zigbee2MQTT** | Bridge / Add-on — übersetzt Zigbee ↔ MQTT | Gerät **Zigbee2MQTT Bridge** (Kontrollraum), Software **2.14.2**, Verbindung *an*, Update *nicht ausstehend* |
| **MQTT** | Transport in Home Assistant | Geräte erscheinen unter Integration **MQTT** mit Quelle Zigbee2MQTT (`via` Bridge) |
| **Coordinator** | Funk-Stick am Host / an der Bridge | Firmware **20240716** (`sensor.zigbee2mqtt_bridge_coordinator_version`); IEEE `0x00124b0025908a53` |
| **Permit join** | Koppelmodus für neue Geräte | Schalter `Zigbee2MQTT Bridge Permit join` — aktuell **aus** (nur Admin einschalten) |

**Kurz erklärt:** Der Stick (Coordinator) sendet und empfängt Zigbee. Zigbee2MQTT spricht mit dem Stick und veröffentlicht Geräte über MQTT. Home Assistant liest MQTT und zeigt Lampen, Sensoren und Taster in der Übersicht.

Anlernen neuer Geräte, Zigbee2MQTT-Frontend und Netzwerk-Reset: **nur Admin**.

---

## Geräteübersicht

Vollständige Tabelle inkl. Hersteller und Raum: Kapitel *Systemübersicht* (Abschnitt Zigbee).

Rollen auf einen Blick:

| Rolle | Geräte (Namen in HA, Beispiele) |
|-------|----------------------------------|
| Bridge | **Zigbee2MQTT Bridge** (Kontrollraum) |
| Gruppen | **TV-WZ-Gruppe**, **Schlafzimmer** (Zigbee2MQTT-Gruppen) |
| Licht | **TV Licht**, **Spot1/Spot2**, **Küchenlicht**, **Mauslicht**, **Schranklampe**, **Balkonlicht03**, … |
| Steckdosen / Plugs | **AV Verstärker**, **Stern**, **Jura**, **Modem**, **Nachttisch**, … (IKEA ASKVADER, OSRAM, Innr, …) |
| Sensoren | Wassermelder (z. B. **WZM-Wasser**), Rauch (**RM-WZ**, **RM-SZ**), Temp (**BZ-Temp**, **Serverschank**) |
| Taster / Dimmer | **WZ-Rollo** (Smart Button, 4 Tasten), **Schalter Küche**, **Maus Schalter**, **Drehknopf**, Hue-Dimmer SZ |
| Cover / Aktoren | u. a. Shelly über Zigbee2MQTT (**SZ-Tür**, **SZ-Fenster**, **Küche-LI/RE**, **WZ-Tür**) — siehe Systemübersicht |

> Hinweis: Manche Cover-Namen in der Entity-ID sind historisch (`cover.sz_door` = Schlafzimmer-Gruppe o. Ä.). Anzeigenamen in der UI sind maßgeblich.

---

## Automationen mit Zigbee

Nur Automationen in Home Assistant, die Zigbee-Entities/Events **auslösen** oder Zigbee-Geräte **steuern**. Zigbee2MQTT-interne Regeln sind hier nicht dokumentiert.

| Automation | Auslöser | Wirkung | Zigbee-Bezug |
|------------|----------|---------|--------------|
| **Rollo-WZ auf** | **WZ-Rollo Taste 2** (`event.wohnzimmer_sbbt_…_button_2`, press) | Öffnet Homematic-Rollos Mitte-Links, Mitte-Rechts, RE-LI | Zigbee-Taster → Homematic-Cover |
| **Rollo-WZ zu** | **WZ-Rollo Taste 3** | Setzt Positionen der vier Wohnzimmer-Rollos (teilweise zu) | Zigbee-Taster → Homematic-Cover |
| **WZ-Tür-oben** | **WZ-Rollo Taste 1** | Öffnet die WZ-Tür (Cover) | Zigbee-Taster → Cover |
| **WZ-Tür schließen** | **WZ-Rollo Taste 4** | Schließt `cover.wz_tur_2` | Zigbee-Taster → Cover |
| **Mauslicht an / aus** | MQTT-Aktion am **Maus Schalter** (press) | Schaltet **Mauslicht** (Hue Strip, Bad) | Zigbee-Taster → Zigbee-Licht |
| **Küchenlicht ein-aus** | MQTT on/off am Küchen-Schalter | Schaltet **Waschbeckenlicht** | Zigbee-Taster → Zigbee-Licht |

**WZ-Rollo-Taster:** physischer 4-Tasten-Button im Wohnzimmer; Tasten 2/3 steuern Homematic-Rollos (siehe auch Kapitel *Homematic*). Batterie/Signal: Sensoren **WZ-Rollo Batterie** / **WZ-Rollo Signalstärke**.

Allgemeine Bedienung von Szenen/Automationen: Kapitel *Szenen & Automationen*.

---

## Was Sie brauchen

- Angemeldet unter **https://ha02.stadthagen.dev**
- Zigbee-Gerät, das bereits in Home Assistant sichtbar ist

## Typische Bedienung

### Licht / Steckdose

1. Übersicht oder Raum-Dashboard öffnen
2. Karte tippen: an/aus, Dimmen, Farbe (wenn unterstützt)
3. Fertig — siehe Kapitel *Lichter & Schalter*

### Sensoren ablesen

- Temperatur, Feuchte, Wassermelder, Rauch: Wert auf der Karte bzw. Historie
- Bei „Batterie niedrig“ / Push-Benachrichtigung: Batterie wechseln (Admin, falls unsicher)

### Taster an der Wand

- Physischer Taster löst oft eine **Automation** aus (Licht, Rollo, Tür)
- Wohnzimmer **WZ-Rollo**: Taste 1 Tür auf, 2 Rollos auf, 3 Rollos zu (teilweise), 4 Tür zu
- Doppelklick / langer Druck: nur nutzen, wenn der Admin das erklärt hat

### Gruppen

- **TV-WZ-Gruppe** / **Schlafzimmer**: mehrere Lampen gemeinsam — eine Karte schaltet alle Mitglieder

## Was Sie nicht selbst ändern sollten

- Zigbee2MQTT-WebUI (Permit join, Netzwerk-Map, Geräte löschen)
- Coordinator / Stick abziehen oder umstecken
- Geräte „zurücksetzen“ / neu pairen ohne Admin
- MQTT-Broker-Einstellungen oder Bridge-Restart ohne Absprache
- Automationen und Tastenbelegung wild umbauen

## Tipps

- Batterie-Sensoren und Taster (z. B. WZ-Rollo) bei Warnung wechseln
- Stecker-Geräte möglichst nicht dauerhaft vom Strom nehmen — sie halten das Mesh
- Metallschränke und dicke Wände schwächen das Signal — bei Ausfällen Admin
- Linkqualität / Signalstärke-Sensoren sind Hinweise für den Admin, kein Alltags-Steuergerät
- Nach Stromausfall am Stick: kurz warten; Bridge-Verbindung prüfen (Admin)

## Wenn etwas nicht klappt

| Symptom | Was tun |
|---------|---------|
| Gerät „nicht verfügbar“ | Strom/Batterie; 1–2 Min. warten; Admin (Bridge-Verbindung) |
| Befehl kommt verzögert | Mesh schwach — Admin (Repeater / Position) |
| Gerät fehlt komplett | Umbenannt/Raum gewechselt? Admin |
| Pairing klappt nicht | Nur Admin: Permit join, Abstand zum Stick, frische Batterie |
| WZ-Rollos reagieren nicht auf Taster | Automationen **Rollo-WZ auf/zu**; Batterie **WZ-Rollo**; sonst Rollo-Karte (Homematic) |
| WZ-Tür reagiert nicht auf Taste 1/4 | Automationen **WZ-Tür-oben** / **WZ-Tür schließen**; Cover-Karte testen |
| Mauslicht / Küchenlicht ohne Taster | Automationen **Mauslicht…** / **Küchenlicht ein-aus**; Lichtkarte direkt tippen |
| Nur ein Raum betroffen | Oft Funkloch — Admin |
| Bridge „Connection state“ aus | Zigbee2MQTT/MQTT — Admin (nicht selbst restarten) |

## Geräteliste

Aktuelle Zigbee2MQTT-Geräte nach Raum: Kapitel *Systemübersicht*.

## Hilfe

- Kapitel *Lichter & Schalter*, *Szenen & Automationen*, *Homematic* (Rollo-WZ), *Systemübersicht*
- Allgemeine Störungen: Kapitel *Wenn etwas nicht klappt*
- Ansprechpartner: Homelab-Admin
