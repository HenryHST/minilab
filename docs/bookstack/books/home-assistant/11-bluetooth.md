# Bluetooth

## Was Sie erreichen

Sie verstehen, wofür Bluetooth in Home Assistant genutzt wird, welche Geräte typisch sind und was bei Verbindungsproblemen hilft.

## Was ist Bluetooth hier?

Bluetooth (oft **Bluetooth Low Energy / BLE**) verbindet Geräte **über kurze Distanz** mit dem Home-Assistant-Rechner oder einem Bluetooth-Proxy (ESP-Gerät im Haus).

Typische Beispiele:

- Thermometer / Hygrometer (z. B. Xiaomi/ATC)
- Pflanzen- oder Bodenfeuchte-Sensoren
- Fitness-/Präsenz-Beacons (seltener)
- Manche Schlösser oder Buttons

Bluetooth ist **kein** Ersatz für Zigbee/Matter im ganzen Haus — die Reichweite ist geringer. Deshalb gibt es manchmal mehrere Proxies in verschiedenen Räumen (Admin).

## Was Sie brauchen

- Angemeldet unter **https://ha02.stadthagen.dev**
- Bluetooth-/BLE-Sensor, der bereits eingerichtet ist

## Geräte nutzen

1. Übersicht oder Raum öffnen
2. Sensorwerte ablesen (Temperatur, Luftfeuchtigkeit, Batterie, …)
3. Die meisten BLE-Geräte sind **nur Anzeige** — es gibt nichts zum „Einschalten“
4. Detailansicht: Karte tippen → Verlauf

> Ob ein Sensor Bluetooth nutzt, ist für die Bedienung egal. Wichtig ist der Name und der Raum.

## Neues Bluetooth-Gerät (mit Admin)

1. Gerät mit frischer Batterie bereitlegen
2. Admin startet Erkennung in Home Assistant (Bluetooth-Integration / Passiveive)
3. Gerät nah an den HA-Host oder einen Proxy legen
4. Nach Erscheinen: Name und Raum setzen
5. Danach Sensor nur noch ablesen

## Tipps

- Batterie wechseln, wenn HA „low“ meldet — viele Sensoren verschwinden sonst still
- Nach Batteriewechsel: Gerät kurz in die Nähe des Proxies legen, bis Werte wieder kommen
- Metallgehäuse und Kühlschranknähe stören Bluetooth
- Nicht erwarten, dass ein Sensor im Gartenhaus ohne Proxy zuverlässig ankommt

## Wenn etwas nicht klappt

| Symptom | Was tun |
|---------|---------|
| Keine neuen Werte | Batterie; Gerät näher an Proxy/HA; 10 Minuten warten |
| Gerät fehlt | Batterie leer oder außer Reichweite — Admin (Proxy) |
| Werte springen / Lücken | Reichweite/Störung — Admin |
| Doppelte Sensoren | Alte und neue Entity — Admin aufräumen |
| „Bluetooth“-Fehler in HA | Stick/Proxy — nur Admin |

## Abgrenzung zu anderen Funkarten

| Technik | Typisch für | Reichweite (Haus) |
|---------|-------------|-------------------|
| Bluetooth / BLE | Sensoren nah am Proxy | eher Raum / Etage |
| Zigbee | Lampen, Sensoren, Steckdosen | gut mit Mesh |
| Matter | neue Multi-Hersteller-Geräte | WLAN oder Thread |
| Homematic | Heizung, Taster, Kontakte (DE) | eigenes Funknetz |

## Hilfe

- Kapitel *Die Übersicht lesen* und *Wenn etwas nicht klappt*
- Ansprechpartner: Homelab-Admin
