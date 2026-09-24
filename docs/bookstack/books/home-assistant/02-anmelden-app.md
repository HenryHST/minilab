# Anmelden & App

## Was Sie erreichen

Sie melden sich an Home Assistant an — im Browser und optional auf dem Smartphone.

## Was Sie brauchen

- Browser oder die **Home Assistant Companion**-App
- Zugangsdaten (Homelab-Konto oder lokaler HA-Benutzer laut Admin)

## Im Browser anmelden

1. Öffnen Sie **https://ha02.stadthagen.dev**
2. Wenn eine Login-Seite erscheint, melden Sie sich mit Ihrem Konto an
3. Nach dem Login landen Sie auf der **Übersicht** (Dashboard)
4. Oben links öffnet das Menü (drei Striche): Übersicht, Einstellungen, Ihr Profil

> Tipp: Speichern Sie die Seite als Lesezeichen („Home“ / „Haus“).

## App auf dem Smartphone (empfohlen)

1. Installieren Sie **Home Assistant** aus dem App Store (iOS) bzw. Play Store (Android)
2. App öffnen → **„Eigene Installation“** / Server hinzufügen
3. Adresse eingeben: `https://ha02.stadthagen.dev`
4. Mit demselben Konto anmelden wie im Browser
5. Optional: Benachrichtigungen erlauben (für Alarme/Erinnerungen aus dem Haus)

### App-Vorteile

- Schneller Zugriff vom Startbildschirm
- Push-Benachrichtigungen (wenn eingerichtet)
- Standort nur nutzen, wenn Admin und Sie das bewusst wollen

## Abmelden / Konto wechseln

1. Menü → **Benutzerprofil** (Ihr Name unten oder unter Einstellungen)
2. **Abmelden** wählen
3. Danach erneut mit dem gewünschten Konto anmelden

## Wenn etwas nicht klappt

| Symptom | Was tun |
|---------|---------|
| Seite nicht erreichbar | WLAN/VPN prüfen; https://status.stadthagen.dev ansehen |
| Login wird abgelehnt | Passwort/Konto prüfen; Admin um Reset bitten |
| App findet den Server nicht | Adresse exakt `https://ha02.stadthagen.dev` (mit `https://`) |
| „SSL“ / Zertifikat-Warnung | Datum/Uhrzeit am Gerät prüfen; Admin informieren |
| Weiße/leere Seite | Neu laden; anderen Browser oder App versuchen |
