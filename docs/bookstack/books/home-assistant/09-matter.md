# Matter

## Was Sie erreichen

Sie wissen, was Matter ist, wie Matter-Geräte in Home Assistant genutzt werden und worauf Sie beim Koppeln achten müssen.

## Was ist Matter?

Matter ist ein **herstellerübergreifender Standard** für Smart-Home-Geräte (Lampen, Steckdosen, Schlösser, Sensoren, …). Ziel: Geräte verschiedener Marken sollen sich einfacher gemeinsam steuern lassen.

Matter-Geräte laufen oft über:

- **WLAN**, oder
- **Thread** (Funknetz, ähnlich Zigbee — braucht Border-Router, z. B. manchen Apple-/Google-/Amazon-Geräten oder speziellen Sticks)

In Home Assistant erscheinen sie danach als normale Lampen, Schalter usw.

Die Integration und das erste Pairing macht in der Regel der **Admin**.

## Was Sie brauchen

- Angemeldet unter **https://ha02.stadthagen.dev**
- Matter-Gerät, das bereits eingerichtet ist (oder Pairing mit Admin)

## Geräte bedienen

1. Übersicht öffnen
2. Matter-Gerät wie jedes andere steuern (tippen, dimmen, Status lesen)
3. In der Oberfläche gibt es meist **keinen** besonderen „Matter“-Knopf — die Technik läuft unsichtbar

## Neues Matter-Gerät koppeln (mit Admin)

Ablauf typisch (Details hängen vom Gerät ab):

1. Gerät auspacken und laut Hersteller in Pairing-Modus bringen
2. **QR-Code** oder Zahlencode bereithalten (Aufkleber, Anleitung, App)
3. Admin startet in Home Assistant **Einstellungen → Geräte → Matter-Gerät hinzufügen** (oder vergleichbar)
4. Code scannen / eingeben und warten, bis das Gerät online ist
5. Name und Raum vergeben — danach nutzen Sie es auf dem Dashboard

### Wichtige Hinweise

- Manche Geräte lassen sich nur **einmal** einfach koppeln; Zurücksetzen nur mit Admin
- Matter über Thread braucht ein funktionierendes Thread-Netz — das richtet der Admin ein
- Apple-/Google-/Amazon-Ökosysteme können parallel existieren; wer „führt“, klärt der Admin

## Tipps

- QR-Code / Setup-Code **aufbewahren** (Foto in Passwort-Safe oder Mappe)
- Nach Stromausfall: 1–2 Minuten warten, bevor Sie „kaputt“ melden
- Firmware-Updates von Matter-Geräten: Admin oder Hersteller-App — nicht auf Verdacht tippen

## Wenn etwas nicht klappt

| Symptom | Was tun |
|---------|---------|
| Gerät offline | Strom/WLAN prüfen; warten; Admin (Thread/Border-Router) |
| Pairing bricht ab | Gerät näher an Router/Border-Router; Code prüfen; Admin |
| Gerät in Hersteller-App, nicht in HA | Noch nicht zu Home Assistant geteilt/übernommen — Admin |
| Doppelte Geräte | Alte Integration/Rest — Admin aufräumen lassen |
| Schaltet unzuverlässig | WLAN/Thread-Reichweite — Admin |

## Hilfe

- Kapitel *Lichter & Schalter* / *Klima* für die Bedienung
- Ansprechpartner: Homelab-Admin
