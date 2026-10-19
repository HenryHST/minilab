import { normalizeLocale, t } from "./i18n.js";

const state = {
  locale: normalizeLocale(localStorage.getItem("podcraft.locale") || navigator.language?.slice(0, 2)),
  theme: localStorage.getItem("podcraft.theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  me: null,
  schedule: null,
  workloads: [],
  basicAuth: localStorage.getItem("podcraft.basic") || "",
  logPaused: false,
  logMinimized: false,
  guideOpen: localStorage.getItem("podcraft.guideDismissed") !== "1",
  route: location.pathname,
  error: "",
};

function applyChrome() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.lang = state.locale;
  const icon = document.querySelector('link[rel="icon"][data-theme-icon]');
  if (icon) {
    icon.href = brandLogoSrc();
  }
}

function brandLogoSrc() {
  return state.theme === "light" ? "/static/brand/logo-light.svg" : "/static/brand/logo-dark.svg";
}

function brandMarkHtml(size = 36) {
  return `<img class="brand-mark" src="${brandLogoSrc()}" alt="" width="${size}" height="${size}" />`;
}

function miniPulseSvg() {
  return `<svg class="mini-pulse" viewBox="0 0 28 12" aria-hidden="true"><path d="M1 6 H6 L8 3 L11 9 L14 2 L17 8 L19 6 H27" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function headers(json = true) {
  const h = {};
  if (json) h["Accept"] = "application/json";
  if (state.basicAuth) h["Authorization"] = `Basic ${state.basicAuth}`;
  return h;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { ...headers(), ...(opts.headers || {}) },
  });
  if (res.status === 401) {
    state.me = null;
    throw Object.assign(new Error("unauthorized"), { status: 401 });
  }
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function logoutHref() {
  // Authentik ForwardAuth outpost (single-app); Ingress is managed by the outpost.
  return "/outpost.goauthentik.io/sign_out";
}

function doLogout() {
  localStorage.removeItem("podcraft.basic");
  state.basicAuth = "";
  state.me = null;
  // Always hit Authentik sign_out when OIDC/both; harmless redirect if already logged out.
  window.location.href = logoutHref();
}

function tip(key) {
  return `data-tip="${escapeHtml(t(state.locale, key))}" title="${escapeHtml(t(state.locale, key))}"`;
}

function topControls({ showHelp = false } = {}) {
  return `
    <div class="top-actions">
      <button class="chip ${state.theme === "light" ? "active" : ""}" data-action="theme-light" type="button" ${tip("tipThemeLight")} aria-label="${t(state.locale, "tipThemeLight")}">☀</button>
      <button class="chip ${state.theme === "dark" ? "active" : ""}" data-action="theme-dark" type="button" ${tip("tipThemeDark")} aria-label="${t(state.locale, "tipThemeDark")}">☾</button>
      <button class="chip ${state.locale === "de" ? "active" : ""}" data-action="lang-de" type="button" ${tip("tipLangDe")}>DE</button>
      <button class="chip ${state.locale === "en" ? "active" : ""}" data-action="lang-en" type="button" ${tip("tipLangEn")}>EN</button>
      ${showHelp ? `<button class="chip ${state.guideOpen ? "active" : ""}" data-action="toggle-guide" type="button" ${tip("tipHelp")}>?</button>` : ""}
      ${state.me ? `<span class="user-pill">${t(state.locale, "user")}: ${escapeHtml(state.me.username)}</span>` : ""}
      ${state.me ? `<a class="chip" href="/settings" ${tip("tipSettings")}>${t(state.locale, "settings")}</a>` : ""}
      ${state.me ? `<button class="chip" data-action="logout" type="button" ${tip("tipLogout")}>${t(state.locale, "logout")}</button>` : ""}
    </div>`;
}

function guideHtml() {
  if (!state.guideOpen) return "";
  return `
    <section class="guide-card" id="guide-card" aria-label="${t(state.locale, "guideTitle")}">
      <div class="guide-head">
        <div>
          <h2>${t(state.locale, "guideTitle")}</h2>
          <p class="guide-lead">${t(state.locale, "guideLead")}</p>
        </div>
        <button class="btn ghost" type="button" data-action="dismiss-guide" ${tip("tipHelp")}>✕</button>
      </div>
      <ol class="guide-steps">
        <li><span class="guide-step-num">1</span><span>${t(state.locale, "guideStep1")}</span></li>
        <li><span class="guide-step-num">2</span><span>${t(state.locale, "guideStep2")}</span></li>
        <li><span class="guide-step-num">3</span><span>${t(state.locale, "guideStep3")}</span></li>
        <li><span class="guide-step-num">4</span><span>${t(state.locale, "guideStep4")}</span></li>
      </ol>
      <div class="guide-actions">
        <button class="btn" type="button" data-action="dismiss-guide">${t(state.locale, "guideDismiss")}</button>
      </div>
    </section>`;
}

function pulseSvg(active) {
  return `
    <div class="pulse-wrap ${active ? "pulse-active" : "pulse-idle"}">
      <svg class="pulse-svg" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true">
        <path class="pulse-path" d="M0 30 H80 L100 30 L115 10 L130 50 L145 20 L160 30 H240 L255 30 L270 8 L285 52 L300 18 L315 30 H400 L415 30 L430 12 L445 48 L460 22 L475 30 H600" />
      </svg>
    </div>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function phaseLabel(phase) {
  const key = {
    Running: "phaseRunning",
    Stopped: "phaseStopped",
    Starting: "phaseStarting",
    Degraded: "phaseDegraded",
    Failed: "phaseFailed",
    Unknown: "phaseUnknown",
  }[phase] || "phaseUnknown";
  return t(state.locale, key);
}

function phaseClass(phase) {
  return String(phase || "unknown").toLowerCase();
}

function statusDotClass(phase) {
  if (phase === "Running") return "on";
  if (phase === "Degraded" || phase === "Starting") return "warn";
  if (phase === "Failed") return "err";
  return "";
}

function workloadIconHtml(w) {
  const letter = escapeHtml((w.id || "?").slice(0, 2).toUpperCase());
  if (w.icon) {
    return `<img class="workload-icon" src="${escapeHtml(w.icon)}" alt="" width="44" height="44" loading="lazy" onerror="this.onerror=null;this.outerHTML='<div class=&quot;workload-icon fallback&quot; aria-hidden=&quot;true&quot;>${letter}</div>'" />`;
  }
  return `<div class="workload-icon fallback" aria-hidden="true">${letter}</div>`;
}

function liveBadgeHtml(phase) {
  const live = phase === "Running";
  const cls = phaseClass(phase);
  return `
    <span class="live-badge ${cls}" ${tip("tipLive")}>
      ${live ? miniPulseSvg() : `<span class="status-dot ${statusDotClass(phase)}"></span>`}
      ${escapeHtml(phaseLabel(phase))}
    </span>`;
}

function scheduleColsHtml(w) {
  if (!w.schedule) {
    return `<div class="time-cols muted-cols"><div class="time-col"><span class="time-label">${t(state.locale, "scheduleOff")}</span><span class="time-value">—</span></div></div>`;
  }
  const start = state.schedule?.start || "—";
  const end = state.schedule?.end || "—";
  const day = t(state.locale, "today");
  return `
    <div class="time-cols">
      <div class="time-col">
        <span class="time-label">${t(state.locale, "started")}</span>
        <span class="time-value">${escapeHtml(start)} · ${day}</span>
      </div>
      <div class="time-col">
        <span class="time-label">${t(state.locale, "stopAt")}</span>
        <span class="time-value">${escapeHtml(end)} · ${day}</span>
      </div>
    </div>`;
}

function workloadDetailHtml(w) {
  const rs = w.replicaset;
  const pods = Array.isArray(w.pods) ? w.pods : [];
  const rsText = rs ? `${escapeHtml(rs.name)} · ${rs.ready}/${rs.desired}` : "—";
  const podText = pods.length
    ? pods.map((p) => `${escapeHtml(p.name)} (${escapeHtml(p.phase)})`).join(", ")
    : "—";
  return `
    <details class="workload-details">
      <summary>${t(state.locale, "details")}</summary>
      <div class="workload-status">
        <span>${t(state.locale, "replicaset")}: <code>${rsText}</code></span>
        <span>${t(state.locale, "pods")}: <code>${podText}</code></span>
      </div>
    </details>`;
}

function renderLogin() {
  const root = document.getElementById("app");
  root.innerHTML = "";
  root.append(
    el(`
    <div class="login-view">
      <div class="login-top">${topControls()}</div>
      <div class="login-bg">${pulseSvg(true)}</div>
      <div class="login-card">
        <div class="brand">${brandMarkHtml(64)}</div>
        <h1>podcraft</h1>
        <p>${t(state.locale, "tagline")}</p>
        <div class="login-actions">
          <a class="btn" href="/">${t(state.locale, "loginOidc")}</a>
          <details>
            <summary class="chip" style="display:inline-block;cursor:pointer">${t(state.locale, "loginBasic")}</summary>
            <form id="basic-form" class="form-grid" style="margin-top:0.75rem;text-align:left">
              <label>${t(state.locale, "username")}<input name="user" autocomplete="username" required /></label>
              <label>${t(state.locale, "password")}<input name="pass" type="password" autocomplete="current-password" required /></label>
              <button class="btn" type="submit">${t(state.locale, "signIn")}</button>
            </form>
          </details>
        </div>
        ${state.error ? `<p class="error-banner">${escapeHtml(state.error)}</p>` : ""}
      </div>
    </div>`),
  );
  root.querySelector("#basic-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const token = btoa(`${fd.get("user")}:${fd.get("pass")}`);
    state.basicAuth = token;
    localStorage.setItem("podcraft.basic", token);
    state.error = "";
    await boot();
  });
  bindChrome(root);
}

function renderApp() {
  const root = document.getElementById("app");
  const active = !!state.schedule?.active_now;
  const title = active
    ? t(state.locale, "scheduleOnlineUntil", { end: state.schedule?.end || "—" })
    : t(state.locale, "scheduleOfflineUntil", { start: state.schedule?.start || "—" });

  if (state.route.startsWith("/settings")) {
    root.innerHTML = "";
    root.append(
      el(`
      <div class="app-shell">
        <header class="topbar">
          <a class="brand" href="/">
            ${brandMarkHtml(36)}
            <span class="brand-name">podcraft</span>
          </a>
          ${topControls({ showHelp: false })}
        </header>
        <main class="main">
          <div class="settings-card">
            <h1>${t(state.locale, "settings")}</h1>
            <form id="settings-form" class="form-grid">
              <label><span>${t(state.locale, "scheduleEnabled")}</span>
                <select name="enabled">
                  <option value="true" ${state.schedule?.enabled ? "selected" : ""}>on</option>
                  <option value="false" ${!state.schedule?.enabled ? "selected" : ""}>off</option>
                </select>
              </label>
              <div class="form-row">
                <label>${t(state.locale, "startTime")}<input name="start" value="${escapeHtml(state.schedule?.start || "06:30")}" pattern="\\d{2}:\\d{2}" required /></label>
                <label>${t(state.locale, "endTime")}<input name="end" value="${escapeHtml(state.schedule?.end || "23:45")}" pattern="\\d{2}:\\d{2}" required /></label>
              </div>
              <label>${t(state.locale, "timezone")}<input name="timezone" value="${escapeHtml(state.schedule?.timezone || "Europe/Berlin")}" required /></label>
              <p class="hint">${t(state.locale, "authHint")}: ${escapeHtml(state.me?.configured_auth_mode || "—")} · ${t(state.locale, "version")}: ${escapeHtml(state.me?.version || "—")}</p>
              <button class="btn" type="submit">${t(state.locale, "save")}</button>
            </form>
          </div>
        </main>
        ${logPanelHtml()}
      </div>`),
    );
    root.querySelector("#settings-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      state.schedule = await api("/api/v1/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({
          enabled: fd.get("enabled") === "true",
          start: fd.get("start"),
          end: fd.get("end"),
          timezone: fd.get("timezone"),
        }),
      });
      await boot();
    });
    bindChrome(root);
    bindLog(root);
    return;
  }

  const rows = state.workloads
    .map((w) => {
      const on = w.desired > 0;
      const phase = w.phase || (on ? "Running" : "Stopped");
      const meta = w.description || `${w.namespace}/${w.deployment}`;
      return `
        <div class="workload-row" data-id="${escapeHtml(w.id)}">
          ${workloadIconHtml(w)}
          <div class="workload-id">
            <h2>${escapeHtml(w.id)}</h2>
            <p class="workload-meta">${escapeHtml(meta)} · ${t(state.locale, "ready")} ${w.ready}/${w.desired}</p>
            ${workloadDetailHtml(w)}
          </div>
          ${liveBadgeHtml(phase)}
          ${scheduleColsHtml(w)}
          <div class="workload-actions">
            ${
              on
                ? `<button class="icon-btn danger" data-action="stop" data-id="${escapeHtml(w.id)}" type="button" ${tip("tipStop")} aria-label="${t(state.locale, "stop")}"><span class="icon-stop"></span></button>`
                : `<button class="icon-btn primary" data-action="start" data-id="${escapeHtml(w.id)}" type="button" ${tip("tipStart")} aria-label="${t(state.locale, "start")}"><span class="icon-play"></span></button>`
            }
          </div>
        </div>`;
    })
    .join("");

  root.innerHTML = "";
  root.append(
    el(`
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="/">
          ${brandMarkHtml(36)}
          <span class="brand-name">podcraft</span>
        </a>
        ${topControls({ showHelp: true })}
      </header>
      <main class="main">
        ${state.error ? `<div class="error-banner">${escapeHtml(state.error)}</div>` : ""}
        ${guideHtml()}
        <section class="schedule-band ${active ? "is-live" : "is-idle"}">
          <div class="schedule-band-copy">
            <h1>${title}</h1>
            <p class="schedule-meta">${t(state.locale, "scheduleWindow", {
              start: state.schedule?.start || "—",
              end: state.schedule?.end || "—",
              tz: state.schedule?.timezone || "—",
            })}</p>
          </div>
          ${pulseSvg(active)}
        </section>
        <section>
          <div class="section-head">
            <h2>${t(state.locale, "workloads")}</h2>
            ${
              !state.guideOpen
                ? `<button class="chip" type="button" data-action="toggle-guide" ${tip("tipHelp")}>${t(state.locale, "guideShow")}</button>`
                : ""
            }
          </div>
          <div class="workload-list">${rows || `<p class="hint">${t(state.locale, "loading")}</p>`}</div>
        </section>
      </main>
      ${logPanelHtml()}
    </div>`),
  );

  root.querySelectorAll("[data-action=start],[data-action=stop]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      btn.disabled = true;
      try {
        await api(`/api/v1/workloads/${id}/${action}`, { method: "POST" });
        await refreshData();
        renderApp();
      } catch (err) {
        state.error = String(err.message || err);
        renderApp();
      }
    });
  });
  bindChrome(root);
  bindLog(root);
}

function logPanelHtml() {
  return `
    <aside class="log-panel ${state.logMinimized ? "minimized" : ""}" id="log-panel">
      <div class="log-head">
        <strong>${t(state.locale, "logs")}</strong>
        <div>
          <button type="button" data-log="pause">${state.logPaused ? t(state.locale, "resume") : t(state.locale, "pause")}</button>
          <button type="button" data-log="clear">${t(state.locale, "clear")}</button>
          <button type="button" data-log="minmax">${state.logMinimized ? t(state.locale, "expand") : t(state.locale, "minimize")}</button>
        </div>
      </div>
      <div class="log-body" id="log-body"></div>
    </aside>`;
}

function bindChrome(root) {
  root.querySelectorAll("[data-action]").forEach((btn) => {
    const a = btn.dataset.action;
    if (a === "logout") {
      btn.addEventListener("click", () => doLogout());
      return;
    }
    if (a === "dismiss-guide") {
      btn.addEventListener("click", () => {
        state.guideOpen = false;
        localStorage.setItem("podcraft.guideDismissed", "1");
        renderApp();
      });
      return;
    }
    if (a === "toggle-guide") {
      btn.addEventListener("click", () => {
        state.guideOpen = !state.guideOpen;
        localStorage.setItem("podcraft.guideDismissed", state.guideOpen ? "0" : "1");
        renderApp();
      });
      return;
    }
    if (!a?.startsWith("theme") && !a?.startsWith("lang")) return;
    btn.addEventListener("click", () => {
      if (a === "theme-light") state.theme = "light";
      if (a === "theme-dark") state.theme = "dark";
      if (a === "lang-de") state.locale = "de";
      if (a === "lang-en") state.locale = "en";
      localStorage.setItem("podcraft.theme", state.theme);
      localStorage.setItem("podcraft.locale", state.locale);
      applyChrome();
      if (state.me) renderApp();
      else renderLogin();
    });
  });
}

function bindLog(root) {
  const body = root.querySelector("#log-body");
  root.querySelectorAll("[data-log]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const a = btn.dataset.log;
      if (a === "pause") {
        state.logPaused = !state.logPaused;
        renderApp();
      } else if (a === "clear") {
        await api("/api/v1/logs", { method: "DELETE" });
        if (body) body.textContent = "";
      } else if (a === "minmax") {
        state.logMinimized = !state.logMinimized;
        renderApp();
      }
    });
  });
}

function appendLog(entry) {
  if (state.logPaused) return;
  const body = document.getElementById("log-body");
  if (!body) return;
  const line = `[${new Date(entry.ts * 1000).toLocaleTimeString()}] ${entry.level} ${entry.message}\n`;
  body.textContent += line;
  body.scrollTop = body.scrollHeight;
}

let es;
function connectLogs() {
  if (es) es.close();
  const url = state.basicAuth
    ? `/api/v1/logs/stream`
    : `/api/v1/logs/stream`;
  // EventSource cannot set Authorization; poll fallback when basic auth is used.
  if (state.basicAuth) {
    setInterval(async () => {
      if (!state.me || state.logPaused) return;
      try {
        const data = await api("/api/v1/logs?limit=50");
        const body = document.getElementById("log-body");
        if (body && data?.items) {
          body.textContent = data.items
            .map((e) => `[${new Date(e.ts * 1000).toLocaleTimeString()}] ${e.level} ${e.message}`)
            .join("\n");
          body.scrollTop = body.scrollHeight;
        }
      } catch {
        /* ignore */
      }
    }, 4000);
    return;
  }
  es = new EventSource(url);
  es.onmessage = (ev) => {
    try {
      appendLog(JSON.parse(ev.data));
    } catch {
      /* ignore */
    }
  };
}

async function refreshData() {
  state.me = await api("/api/v1/me");
  state.schedule = await api("/api/v1/schedule");
  state.workloads = await api("/api/v1/workloads");
}

async function boot() {
  applyChrome();
  state.route = location.pathname;
  try {
    await refreshData();
    state.error = "";
    renderApp();
    connectLogs();
  } catch (err) {
    if (err.status === 401) {
      renderLogin();
      return;
    }
    state.error = String(err.message || err);
    renderLogin();
  }
}

window.addEventListener("popstate", () => boot());
boot();
