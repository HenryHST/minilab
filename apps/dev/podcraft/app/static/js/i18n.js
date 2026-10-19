const STRINGS = {
  de: {
    tagline: "Workloads im minilab steuern",
    scheduleOnlineUntil: "Online bis {end}",
    scheduleOfflineUntil: "Offline bis {start}",
    scheduleWindow: "Fenster {start} – {end} ({tz})",
    workloads: "Workloads",
    settings: "Systemeinstellungen",
    start: "Start",
    stop: "Stop",
    ready: "bereit",
    desired: "soll",
    loginOidc: "Mit Authentik anmelden",
    loginBasic: "Mit Kennwort",
    username: "Benutzer",
    password: "Passwort",
    signIn: "Anmelden",
    theme: "Theme",
    language: "Sprache",
    logs: "Logs",
    pause: "Pause",
    resume: "Weiter",
    clear: "Leeren",
    minimize: "Min",
    expand: "Max",
    save: "Speichern",
    scheduleEnabled: "Scheduler aktiv",
    startTime: "Start",
    endTime: "Ende",
    timezone: "Zeitzone",
    authHint: "Auth-Modus (Server)",
    version: "Version",
    loading: "Laden…",
    error: "Fehler",
    user: "Benutzer",
    logout: "Abmelden",
  },
  en: {
    tagline: "Control workloads in minilab",
    scheduleOnlineUntil: "Online until {end}",
    scheduleOfflineUntil: "Offline until {start}",
    scheduleWindow: "Window {start} – {end} ({tz})",
    workloads: "Workloads",
    settings: "System settings",
    start: "Start",
    stop: "Stop",
    ready: "ready",
    desired: "desired",
    loginOidc: "Sign in with Authentik",
    loginBasic: "Use password",
    username: "Username",
    password: "Password",
    signIn: "Sign in",
    theme: "Theme",
    language: "Language",
    logs: "Logs",
    pause: "Pause",
    resume: "Resume",
    clear: "Clear",
    minimize: "Min",
    expand: "Max",
    save: "Save",
    scheduleEnabled: "Scheduler enabled",
    startTime: "Start",
    endTime: "End",
    timezone: "Timezone",
    authHint: "Auth mode (server)",
    version: "Version",
    loading: "Loading…",
    error: "Error",
    user: "User",
    logout: "Log out",
  },
};

export function normalizeLocale(raw) {
  return raw === "en" ? "en" : "de";
}

export function t(locale, key, vars = {}) {
  const table = STRINGS[normalizeLocale(locale)] || STRINGS.de;
  let s = table[key] || STRINGS.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}
