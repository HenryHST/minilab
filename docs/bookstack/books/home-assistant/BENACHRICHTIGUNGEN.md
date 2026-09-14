# Benachrichtigungen bei Änderungen am Buch Home Assistant

Es gibt **zwei Quellen** für Änderungen. Beide können eine E-Mail auslösen:

| Quelle | Wann | Mechanismus |
|--------|------|-------------|
| **BookStack (Live-Wiki)** | Jemand bearbeitet Seiten im Buch unter https://book.stadthagen.dev | BookStack **Watch** + SMTP (`bookstack-smtp`) |
| **Git (diese Markdown-Dateien)** | Push/Merge auf `main` unter `docs/bookstack/books/home-assistant/**` | GitHub Action → SMTP |

Empfohlen: **beides** nutzen — Watch für Alltags-Edits in der Wiki, GitHub Action für dokumentierte Git-Updates.

---

## A) BookStack Watch (Live-Wiki) — ohne Extra-Infra

Voraussetzung: SMTP in BookStack funktioniert (Secret `bookstack-smtp`, Testmail unter Settings → Maintenance).

### Admin (einmalig)

1. Rolle der Empfänger: Recht **„Receive notifications“** / Benachrichtigungen empfangen aktivieren (Standard oft nur Admin).
2. Optional: unter **Einstellungen → E-Mail** eine Testmail senden.

### Jeder Empfänger (einmalig)

1. In BookStack anmelden (Authentik).
2. Oben rechts → **Einstellungen / Preferences** → **Benachrichtigungen**.
3. Gewünschte Defaults setzen (Seiten-Updates, ggf. Kommentare).
4. Buch **Home Assistant** öffnen → Aktion **Beobachten / Watch**.
5. Stufe wählen: ideal **Alle Seiten-Updates** (neue Seiten + Änderungen).

Danach: bei Änderungen an Kapitel/Seiten des Buches kommt eine E-Mail mit Link zur Seite (mit leichtem Debouncing bei vielen Speichervorgängen desselben Autors).

### Abbestellen

Am Buch erneut Watch öffnen → **Ignorieren** / Watch entfernen, oder unter Preferences die Watch-Liste bereinigen.

---

## B) GitHub Action (Git-Änderungen)

Workflow: [`.github/workflows/notify-home-assistant-book.yml`](../../../.github/workflows/notify-home-assistant-book.yml)

### Einmalig: Repository-Secrets

In GitHub → Settings → Secrets and variables → Actions:

| Secret | Beispiel / Hinweis |
|--------|-------------------|
| `BOOKSTACK_NOTIFY_SMTP_SERVER` | `mail.henrystadthagen.de` |
| `BOOKSTACK_NOTIFY_SMTP_PORT` | `25` (oder `587` mit STARTTLS) |
| `BOOKSTACK_NOTIFY_SMTP_USERNAME` | optional, leer lassen wenn Relay ohne Auth |
| `BOOKSTACK_NOTIFY_SMTP_PASSWORD` | optional; sonst Secret leer / Dummy |
| `BOOKSTACK_NOTIFY_SMTP_FROM` | `auto@henrystadthagen.de` (wie Alertmanager) |

Empfänger stehen **in Git**: [`recipients.yaml`](recipients.yaml) (kein Secret nötig).

### Ablauf

1. Jemand merged/pushed Änderungen unter `docs/bookstack/books/home-assistant/`.
2. Workflow listet geänderte Dateien und sendet eine Mail an alle `recipients`.
3. Betreff z. B. `[minilab] Home-Assistant-Buch geändert`.

### Empfänger ändern

`recipients.yaml` editieren und nach `main` mergen — keine Secret-Änderung nötig.

### Manuell testen

GitHub → Actions → Workflow **Notify Home Assistant book** → **Run workflow**.

---

## Was nicht abgedeckt ist

- Änderungen nur in BookStack → **keine** GitHub-Mail (dafür Watch).
- Änderungen nur in Git → **keine** BookStack-Watch-Mail, bis der Inhalt importiert wurde.
- Nach Git-Update: Inhalt nach BookStack importieren (siehe [`../../IMPORT.md`](../../IMPORT.md)), damit Live-Wiki und Git wieder übereinstimmen.
