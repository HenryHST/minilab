# Wenn etwas nicht klappt

## Was Sie erreichen

Sie können häufige Home-Assistant-Probleme selbst eingrenzen und dem Admin klare Infos geben.

## Schnell-Check (immer zuerst)

1. **https://status.stadthagen.dev** — sind Homelab-Dienste grün?
2. Anderes Netz versuchen (WLAN vs. Mobilfunk/VPN)
3. Seite neu laden oder App komplett schließen und neu öffnen
4. Am PC im Browser testen: **https://ha02.stadthagen.dev**

## Häufige Fälle

| Problem | Was Sie tun können | Wann Admin? |
|---------|-------------------|-------------|
| Seite/App nicht erreichbar | Netz/VPN, Status-Seite | Wenn Status rot oder Dauerproblem |
| Login fehlgeschlagen | Passwort prüfen | Nach 2 Fehlversuchen / Sperre |
| Ein Gerät „nicht verfügbar“ | Strom, App neu laden | Wenn dauerhaft oder mehrere Geräte |
| Licht/Heizung reagiert nicht | Szene vs. Einzelgerät testen | Wenn nur HA betroffen, Gerät lokal aber geht |
| Alles verzögert | Kurz warten; WLAN am Telefon | Bei anhaltender Langsamkeit |
| Falsche Automatik | Nicht „gegenkämpfen“ | Mit Uhrzeit und Gerät melden |

## Was Sie dem Admin schreiben

Kopiervorlage:

```text
Home Assistant-Problem
- Wann: (Datum, Uhrzeit)
- Gerät/App: Browser / iOS / Android
- Was wollte ich: …
- Was passierte: …
- Fehlermeldung (Text oder Screenshot): …
- Status-Seite zu der Zeit: grün / rot / nicht geprüft
```

## Was Sie nicht tun sollten

- Entwickler-Werkzeuge, YAML oder „Unbekannte Geräte“ löschen
- Fremde Benutzerkonten oder Integrationen entfernen
- Steckdosen von Netzwergeräten (NAS, Router, Server) schalten, ohne Absprache

## Weitere Hilfe

- Dieses Buch: Kapitel *Anmelden*, *Übersicht*, *Lichter*, *Klima*, *Szenen*
- Wiki: https://book.stadthagen.dev
- Status: https://status.stadthagen.dev
- Ansprechpartner: Homelab-Admin
