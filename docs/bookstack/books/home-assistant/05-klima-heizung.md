# Klima & Heizung

## Was Sie erreichen

Sie lesen Raumtemperaturen und stellen die Solltemperatur an Thermostaten ein (soweit freigegeben).

## Was Sie brauchen

- Angemeldet in Home Assistant
- Thermostat- oder Klima-Karte auf dem Dashboard

## Temperatur ablesen

1. Übersicht oder Raum-Dashboard öffnen
2. Karte mit Thermometer / „Heizung“ / Raumname suchen
3. Angezeigte Zahl = **aktuelle** oder **Soll**-Temperatur (oft beides sichtbar)
4. Optional: Karte öffnen → Verlauf der letzten Stunden/Tage

## Solltemperatur ändern

1. Thermostat-Karte öffnen (antippen)
2. Sollwert mit Plus/Minus oder Schieberegler einstellen
3. Kurz warten — das Ventil/Thermostat braucht oft einige Sekunden
4. Nicht extreme Werte setzen (sinnvoller Bereich typisch 16–23 °C — Hausregeln beachten)

## Heizung aus / Absenken

Je nach Setup:

- Modus **Aus**, **Heizen**, **Auto** wählen, **oder**
- Solltemperatur absenken (z. B. 16 °C), **oder**
- Eine fertige **Szene** „Heizung Nacht“ / „Abwesend“ starten (siehe Kapitel *Szenen*)

Wenn unsicher: lieber eine vorhandene Szene nutzen als manuell Extreme einzustellen.

## Klimaanlage / Lüfter (falls vorhanden)

1. Klima-Karte öffnen
2. Ein/Aus und Modus (Kühlen, Lüften, …) wählen
3. Temperatur und Gebläse nur in sinnvollen Grenzen ändern

## Wenn etwas nicht klappt

| Symptom | Was tun |
|---------|---------|
| Temperatur ändert sich nicht | Ventil/Gerät kann verzögern (Minuten); Fenster-offen-Erkennung? |
| Keine Thermostat-Karte | Rechte fehlen oder Gerät nicht angebunden — Admin |
| Heizung heizt trotz Absenkung | Anderes Thermostat im Raum; Automation — Admin fragen |
| „Vorbelegt“ / gesperrt | Kindersicherung oder Automation — nicht erzwingen, Admin fragen |
