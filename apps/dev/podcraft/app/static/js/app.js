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
  route: location.pathname,
  error: "",
};

function applyChrome() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.lang = state.locale;
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

function topControls() {
  return `
    <div class="top-actions">
      <button class="chip ${state.theme === "light" ? "active" : ""}" data-action="theme-light" type="button">☀</button>
      <button class="chip ${state.theme === "dark" ? "active" : ""}" data-action="theme-dark" type="button">☾</button>
      <button class="chip ${state.locale === "de" ? "active" : ""}" data-action="lang-de" type="button">DE</button>
      <button class="chip ${state.locale === "en" ? "active" : ""}" data-action="lang-en" type="button">EN</button>
      ${state.me ? `<span class="user-pill">${t(state.locale, "user")}: ${escapeHtml(state.me.username)}</span>` : ""}
      ${state.me ? `<a class="chip" href="/settings">${t(state.locale, "settings")}</a>` : ""}
      ${state.me ? `<button class="chip" data-action="logout" type="button">${t(state.locale, "logout")}</button>` : ""}
    </div>`;
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
    return `<img class="workload-icon" src="${escapeHtml(w.icon)}" alt="" width="40" height="40" loading="lazy" onerror="this.onerror=null;this.outerHTML='<div class=&quot;workload-icon fallback&quot; aria-hidden=&quot;true&quot;>${letter}</div>'" />`;
  }
  return `<div class="workload-icon fallback" aria-hidden="true">${letter}</div>`;
}

function workloadStatusHtml(w) {
  const rs = w.replicaset;
  const rsLine = rs
    ? `${t(state.locale, "replicaset")}: <code>${escapeHtml(rs.name)}</code> · ${rs.ready}/${rs.desired}`
    : `${t(state.locale, "replicaset")}: —`;
  const pods = Array.isArray(w.pods) ? w.pods : [];
  const podsLine = pods.length
    ? `${t(state.locale, "pods")}: ${pods
        .map(
          (p) =>
            `<code>${escapeHtml(p.name)}</code> ${escapeHtml(p.phase)}${p.ready ? "" : " !"}${
              p.restarts ? ` · ${p.restarts} ${t(state.locale, "restarts")}` : ""
            }`,
        )
        .join(" · ")}`
    : `${t(state.locale, "pods")}: —`;
  return `
    <div class="workload-status">
      <span>${rsLine}</span>
      <span>${podsLine}</span>
    </div>`;
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
        <div class="brand">
          <img src="/static/brand/logo.png" alt="" width="64" height="64" onerror="this.src='/static/brand/logo.svg'" />
        </div>
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
            <img src="/static/brand/logo.png" alt="" width="36" height="36" onerror="this.src='/static/brand/logo.svg'" />
            <span class="brand-name">podcraft</span>
          </a>
          ${topControls()}
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
      return `
        <div class="workload-row" data-id="${escapeHtml(w.id)}">
          ${workloadIconHtml(w)}
          <div>
            <h2>
              <span class="status-dot ${statusDotClass(phase)}"></span>
              ${escapeHtml(w.id)}
              <span class="phase-pill ${phaseClass(phase)}">${escapeHtml(phaseLabel(phase))}</span>
            </h2>
            <p class="workload-meta">${escapeHtml(w.namespace)}/${escapeHtml(w.deployment)} · ${t(state.locale, "ready")} ${w.ready}/${w.desired} · ${escapeHtml(w.description || "")}</p>
            ${workloadStatusHtml(w)}
          </div>
          <div>
            ${
              on
                ? `<button class="btn danger" data-action="stop" data-id="${escapeHtml(w.id)}" type="button">${t(state.locale, "stop")}</button>`
                : `<button class="btn" data-action="start" data-id="${escapeHtml(w.id)}" type="button">${t(state.locale, "start")}</button>`
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
          <img src="/static/brand/logo.png" alt="" width="36" height="36" onerror="this.src='/static/brand/logo.svg'" />
          <span class="brand-name">podcraft</span>
        </a>
        ${topControls()}
      </header>
      <main class="main">
        ${state.error ? `<div class="error-banner">${escapeHtml(state.error)}</div>` : ""}
        <section class="schedule-band">
          <h1>${title}</h1>
          <p class="schedule-meta">${t(state.locale, "scheduleWindow", {
            start: state.schedule?.start || "—",
            end: state.schedule?.end || "—",
            tz: state.schedule?.timezone || "—",
          })}</p>
          ${pulseSvg(active)}
        </section>
        <section>
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
  // #region agent log
  fetch("http://127.0.0.1:7458/ingest/617307a5-b9d4-4557-ad01-d7ba8d199fa8", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e03b97" },
    body: JSON.stringify({
      sessionId: "e03b97",
      runId: "icon-status",
      hypothesisId: "H2-H3",
      location: "app.js:refreshData",
      message: "workloads loaded for UI",
      data: {
        version: state.me?.version || null,
        count: state.workloads?.length || 0,
        rows: (state.workloads || []).map((w) => ({
          id: w.id,
          icon: !!w.icon,
          phase: w.phase || null,
          rs: w.replicaset?.name || null,
          pods: (w.pods || []).map((p) => p.phase),
        })),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
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
