---
title: podcraft
chapter: uebersicht
---

# podcraft

Control plane für k3s-Workloads im minilab (Issue [#146](https://github.com/HenryHST/minilab/issues/146)).

| | |
|---|---|
| Host | `https://podcraft.stadthagen.dev` |
| Namespace | `podcraft` |
| Image | `ghcr.io/henryhst/podcraft` → `registry.stadthagen.dev/dev/podcraft` |
| UI | Pulse (Schedule-Band, Hell/Dunkel, DE/EN, Log-Widget, animierter Herzschlag) |
| Auth | Authentik ForwardAuth (UI) + HTTP Basic für HA (`PODCRAFT_AUTH_MODE=both`), Gruppe `podcraft_admins` |

Gesteuerte Apps (MVP): `drawio`, `it-tools` — Day/Night 06:30–23:45 Europe/Berlin.

**Home Assistant:** Credentials unter Systemeinstellungen → „HA-Passwort rotieren“; Anleitung → [Home Assistant](02-home-assistant.md).

Code: minilab `apps/dev/podcraft/`. Pull-Secret: Infra_LAB `registry-pull` in NS `podcraft`.
