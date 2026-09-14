# Voraussetzungen (ha02)

## Was Sie erreichen

Sie wissen, was Sie brauchen, bevor Home Assistant unter **https://ha02.stadthagen.dev** sinnvoll nutzbar ist.

## Für Sie als Nutzer

| Voraussetzung | Warum |
|---------------|--------|
| Gerät mit Browser **oder** Home-Assistant-App | Bedienung über Web oder Smartphone |
| Netzwerkzugang zum Homelab | Seite muss erreichbar sein (zu Hause im WLAN, per VPN, oder freigegebener Fernzugriff) |
| Benutzerkonto | Login (Homelab-/Authentik-Konto **oder** lokaler HA-Benutzer laut Admin) |
| Optional: Lesezeichen / App mit Server-URL | Schneller Einstieg |

### Checkliste vor dem ersten Login

1. Können Sie **https://status.stadthagen.dev** öffnen? (Netz ok)
2. Öffnet sich **https://ha02.stadthagen.dev**? (HA erreichbar)
3. Haben Sie Zugangsdaten vom Admin?
4. Nach Login: Sehen Sie die Übersicht mit Räumen/Geräten?

Wenn einer der Punkte scheitert → Kapitel *Wenn etwas nicht klappt* oder Admin.

### Was Sie **nicht** brauchen

- Keine Installation von Zigbee-Sticks, Matter-Bridges oder Homematic-Zentralen
- Kein YAML, keine Developer-Tools
- Kein separates „Smart-Home-WLAN“ einrichten (das macht der Admin)

## Für den Betrieb (Admin / Homelab)

Kurz — Details: [`../../../home-assistant/ha02.md`](../../../home-assistant/ha02.md) (Ops-Doku im Repo).

| Voraussetzung | Kurz |
|---------------|------|
| Laufende HA-Instanz auf Host **ha02** | UI typisch Port 8123 |
| DNS **ha02.stadthagen.dev** | Hetzner/Terraform (Site Stadthagen-pro) |
| Pangolin-Ressource → ha02 | Öffentlicher/LAN-Zugang laut Infra_LAB |
| Nutzerkonten / ggf. SSO | Login für Haushaltsnutzer |
| Integrationen nach Bedarf | Zigbee, Matter, Homematic, Bluetooth, … |
| Monitoring (optional) | Node-Exporter `:9100` wird von Prometheus gescraped |

## Weiter

- Nächstes Kapitel: *Anmelden & App*
- Ops/Architektur: Repo-Datei `docs/home-assistant/ha02.md`
