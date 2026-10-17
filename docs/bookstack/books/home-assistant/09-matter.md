# Matter

## Was Sie erreichen

Sie wissen, was bei uns installiert ist (Matter Server, OpenThread Border Router, Integrationen), welche Matter-Geräte es gibt, welche Automationen den Thread-Stack betreffen — und wie Sie die Geräte bedienen bzw. bei Störungen vorgehen.

## Was ist Matter?

Matter ist ein **herstellerübergreifender Standard** für Smart-Home-Geräte (Lampen, Steckdosen, Sensoren, …). Ziel: Geräte verschiedener Marken sollen sich einfacher gemeinsam steuern lassen.

Matter-Geräte laufen oft über:

- **WLAN**, oder
- **Thread** (Funknetz, ähnlich Zigbee — braucht einen **Border-Router**)

In Home Assistant erscheinen sie danach als normale Lampen, Schalter, Sensoren usw.

Die Integration und das erste Pairing macht in der Regel der **Admin**.

---

## Was ist installiert (Admin)

> Kurzüberblick für Support. Einrichtung, Stick und App-Options nur durch Admin.

| Baustein | Was | Stand (2026-10-17) |
|----------|-----|---------------------|
| **Matter Server** (HA-App) | WebSocket-Server für Matter in Home Assistant | Slug `core_matter_server`, Version **9.2.0**, Status *gestartet*, Boot *auto*, Auto-Update *aus*, host_network |
| **OpenThread Border Router** (HA-App) | Thread-Border-Router (Radio: Nabu Casa SkyConnect) | Slug `core_openthread_border_router`, Version **3.3.0**, Status *gestartet*, Boot *auto*, Auto-Update *aus*, host_network |
| **Integration Matter** | Geräte und Entities in HA | Eintrag **Matter**, geladen |
| **Integration Thread** | Thread-Netzwerk in HA | Eintrag **Thread**, geladen |

**Kurz erklärt:** Der Matter Server spricht mit Matter-Geräten. Der OTBR stellt das Thread-Funknetz bereit (über den SkyConnect). Die Integrationen Matter und Thread machen beides in Home Assistant nutzbar.

Pairing, Fabric und Thread-Credentials: **nur Admin** (keine Codes in dieser Doku).

---

## App-Konfiguration (Admin)

Werte aus den App-Options auf ha02 (Supervisor). Keine Secrets; Serial-Pfad und Ports sind Betriebswissen.

### Matter Server (`core_matter_server`)

| Option | Wert | Bedeutung |
|--------|------|-----------|
| `log_level` | `info` | Log-Stufe |
| `time_sync` | `on` | Zeitsynchronisation |
| `beta` | `false` | Beta-Kanal aus |
| `enable_test_net_dcl` | `false` | Test-DCL aus |

Nicht gesetzt (Defaults): `default_fabric_label`, `ble_proxy`, `bluetooth_adapter_id`, `matter_server_args`, `matter_server_env_vars`, `matter_server_version`.

Zusatz: Ingress **an**; Hostname `core-matter-server`; Netzwerk-Mapping `5580/tcp` (bei host_network).

### OpenThread Border Router (`core_openthread_border_router`)

| Option | Wert | Bedeutung |
|--------|------|-----------|
| `device` | `/dev/serial/by-id/usb-Nabu_Casa_SkyConnect_v1.0_584a2edcbd5aed11aee4eb165820eef3-if00-port0` | SkyConnect als Radio |
| `baudrate` | `460800` | UART-Baudrate |
| `flow_control` | `true` | Hardware-Flow-Control |
| `otbr_log_level` | `notice` | OTBR-Log-Stufe |
| `firewall` | `false` | OTBR-Firewall aus |
| `nat64` | `false` | NAT64 aus |
| `beta` | `false` | Beta aus |

Nicht gesetzt: `backbone_interface`, `network_device`.

Zusatz: Geräte `/dev/net/tun`, `/dev/ttyUSB0`; Ports **8080** (Web), **8081** (REST); Privileges `IPC_LOCK`, `NET_ADMIN`, `NET_RAW`; Hostname `core-openthread-border-router`.

---

## Geräteübersicht

Vollständige Tabelle inkl. Modell und Raum: Kapitel *Systemübersicht* (Abschnitt Matter).

Rollen auf einen Blick (Anzeige-Namen in der UI):

| Rolle | Geräte |
|-------|--------|
| LED-Strips (Nanoleaf NL68) | **Strip-li**, **Strip-re**, **Strip-tv** (Wohnzimmer), **Strip-bett** (Schlafzimmer) |
| Temp/Feuchte (IKEA TIMMERFLOTTE) | **AZ-Temp** / **AZ-Feucht**, **Flur-Temp** / **Flur-Feucht**, **Küche-Temp** / **Küche-Feucht** |
| Luftqualität (IKEA ALPSTUGA) | **AIR-WZ** (Wohnzimmer), **AIR-SZ** (Schlafzimmer) |

> Hinweis Admin: Die Geräteobjekte heißen oft noch Modellnamen (`NL68`, `TIMMERFLOTTE…`); die freundlichen Namen stehen an den Entities (Licht/Sensor/Schalter).

---

## Automationen mit Matter / Thread

Nur Automationen in Home Assistant, die den Matter-/Thread-Stack betreffen oder Matter-Entities steuern.

| Automation | Auslöser | Wirkung | Bezug |
|------------|----------|---------|-------|
| **Neustart Border Router** | Zeitplan Mo/Mi/Fr/So **18:40** | Startet die App `core_openthread_border_router` neu; Push-Hinweis | OTBR / Thread |

Derzeit **keine** HA-Automationen, die Matter-Lichter (Strips) oder Matter-Sensoren (TIMMERFLOTTE / ALPSTUGA) direkt auslösen oder steuern — Bedienung über Dashboard / Szenen.

Allgemeine Bedienung von Szenen/Automationen: Kapitel *Szenen & Automationen*.

---

## Was Sie brauchen

- Angemeldet unter **https://ha02.stadthagen.dev**
- Matter-Gerät, das bereits eingerichtet ist (oder Pairing mit Admin)

## Geräte bedienen

1. Übersicht oder Raum-Dashboard öffnen
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
- Matter über Thread braucht ein funktionierendes Thread-Netz (OTBR + SkyConnect) — das richtet der Admin ein
- Apple-/Google-/Amazon-Ökosysteme können parallel existieren; wer „führt“, klärt der Admin

## Tipps

- QR-Code / Setup-Code **aufbewahren** (Foto in Passwort-Safe oder Mappe)
- Nach Stromausfall: 1–2 Minuten warten, bevor Sie „kaputt“ melden
- Firmware-Updates von Matter-Geräten: Admin oder Hersteller-App — nicht auf Verdacht tippen
- OTBR startet planmäßig mehrmals wöchentlich neu (Automation **Neustart Border Router**) — kurze Offline-Phase möglich

## Wenn etwas nicht klappt

| Symptom | Was tun |
|---------|---------|
| Gerät offline | Strom/WLAN prüfen; warten; Admin (Matter Server / OTBR / Thread) |
| Pairing bricht ab | Gerät näher an Border-Router; Code prüfen; Admin |
| Gerät in Hersteller-App, nicht in HA | Noch nicht zu Home Assistant geteilt/übernommen — Admin |
| Doppelte Geräte | Alte Integration/Rest — Admin aufräumen lassen |
| Schaltet unzuverlässig | WLAN/Thread-Reichweite; SkyConnect/OTBR-Status — Admin |
| Viele Thread-Geräte gleichzeitig offline | OTBR-App gestartet? Automation gerade neu gestartet? Admin |

## Geräteliste

Aktuelle Matter-Geräte: Kapitel *Systemübersicht*.

## Hilfe

- Kapitel *Lichter & Schalter* / *Klima & Heizung* / *Systemübersicht*
- Ansprechpartner: Homelab-Admin
