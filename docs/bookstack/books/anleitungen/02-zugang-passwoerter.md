# Zugang & Passwörter

## Was Sie erreichen

Sie öffnen den Passwort-Safe und finden gespeicherte Zugangsdaten.

## Was Sie brauchen

- Browser
- Homelab-Konto (Authentik)

## Schritte

1. Öffnen Sie **https://vaultwarden.stadthagen.dev**
2. Melden Sie sich über **Authentik / SSO** an (nicht ein separates Vaultwarden-Passwort, sofern SSO aktiv ist).
3. Nach dem Login sehen Sie Ihre Tresore / Einträge.
4. Zum Kopieren eines Passworts: Eintrag öffnen → Kopieren-Symbol nutzen.
5. Neue Einträge nur anlegen, wenn Sie dazu berechtigt sind.

## Hinweise

- Teilen Sie Master-Passwörter oder Tresor-Exports **nicht** per E-Mail oder Chat.
- Bei Verlust des Zugangs: Admin kontaktieren (Wiederherstellung nur mit Backup/Admin-Token möglich).

## Wenn etwas nicht klappt

| Problem | Hilfe |
|---------|-------|
| Nur Passwort-Feld, kein SSO | Falsche URL oder SSO noch nicht aktiv — Admin fragen |
| Tresor leer | Noch keine Einträge oder falsches Konto |
| 2FA / Geräte | Admin-Dokumentation bzw. Vaultwarden-Einstellungen prüfen |
