# Zigbee

## Was Sie erreichen

Sie verstehen, was Zigbee ist, wie Zigbee-Geräte in Home Assistant bedient werden und was Sie bei Problemen prüfen können — ohne die Funktechnik selbst einzurichten.

## Was ist Zigbee?

Zigbee ist eine **Funktechnik für smarte Geräte** (Lampen, Steckdosen, Sensoren, Heizkörperthermostate, …). Die Geräte sprechen untereinander und mit einem **Stick/Gateway** (oft am Home-Assistant-Rechner oder als separates Gerät).

Typische Merkmale:

- Kein WLAN am Gerät nötig
- Viele batteriebetriebene Sensoren
- Reichweite über „Mesh“: Geräte mit Netzstecker verstärken das Signal

Die Einrichtung von Stick, Integration (z. B. ZHA oder Zigbee2MQTT) und Pairing macht der **Admin**.

## Was Sie brauchen

- Angemeldet unter **https://ha02.stadthagen.dev**
- Zigbee-Gerät, das bereits in Home Assistant sichtbar ist

## Geräte bedienen

1. Übersicht oder Raum-Dashboard öffnen
2. Gerät suchen (Name z. B. „Küche Bewegung“, „Flur Lampe“)
3. Wie gewohnt tippen: Licht an/aus, Sensorwert ablesen, Thermostat stellen
4. Fertig — Zigbee-Geräte verhalten sich in der Oberfläche wie andere Geräte

> Ob ein Gerät Zigbee nutzt, sehen Sie oft in den Geräte-Details (Admin) oder am Namen. Für die Bedienung ist das meist egal.

## Neues Gerät (nur mit Admin)

Selbst pairen sollten Sie nur, wenn der Admin das freigegeben hat:

1. Admin fragt: Gerät entpacken, Batterie einlegen bzw. an Strom
2. Admin startet in Home Assistant den **Koppelmodus** (ZHA / Zigbee2MQTT / …)
3. Am Gerät: Pairing-Taste / Reset laut Anleitung (oft 5–10 Sekunden halten)
4. Gerät erscheint in Home Assistant → Name und Raum vom Admin setzen
5. Danach bedienen Sie es wie jedes andere Gerät

## Tipps für zuverlässigen Betrieb

- Batterie-Sensoren (Tür, Bewegung, Temperatur) alle paar Monate prüfen, wenn HA „Batterie niedrig“ meldet
- Geräte mit Stecker möglichst nicht dauerhaft vom Strom nehmen — sie helfen dem Funknetz
- Metallschränke und dicke Wände schwächen das Signal — bei Ausfällen Admin informieren
- Nicht wild Geräte zurücksetzen — das trennt sie vom Netz

## Wenn etwas nicht klappt

| Symptom | Was tun |
|---------|---------|
| Gerät „nicht verfügbar“ | Strom/Batterie prüfen; 1–2 Minuten warten; Admin (Stick/Gateway) |
| Befehl kommt verzögert | Mesh schwach — Admin (Repeater / Position) |
| Gerät fehlt komplett | Wurde es umbenannt/Raum gewechselt? Admin |
| Pairing klappt nicht | Abstand zum Stick, frische Batterie, Admin-Anleitung folgen |
| Nur ein Raum betroffen | Oft Funkloch — Admin |

## Hilfe

- Allgemeine Störungen: Kapitel *Wenn etwas nicht klappt*
- Ansprechpartner: Homelab-Admin
