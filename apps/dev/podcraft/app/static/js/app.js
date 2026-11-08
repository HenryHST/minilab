import { normalizeLocale, t } from "./i18n.js";

const PREF = {
  locale: "podcraft.locale",
  theme: "podcraft.theme",
  sidebar: "podcraft.sidebarExpanded",
  clock: "podcraft.showClock",
  avatar: "podcraft.avatarUrl",
  basic: "podcraft.basic",
};

const state = {
  locale: normalizeLocale(localStorage.getItem(PREF.locale) || navigator.language?.slice(0, 2)),
  theme: localStorage.getItem(PREF.theme) || "dark",
  sidebarExpanded: localStorage.getItem(PREF.sidebar) === "1",
  showClock: localStorage.getItem(PREF.clock) !== "0",
  avatarUrl: localStorage.getItem(PREF.avatar) || "",
  me: null,
  schedule: null,
  workloads: [],
  archives: [],
  jobs: { active: [], recent: [] },
  selectedArchive: "latest",
  basicAuth: localStorage.getItem(PREF.basic) || "",
  route: location.pathname,
  error: "",
  toast: "",
  logPaused: false,
  haBasicOnce: null,
  haPassVisible: false,
  userCardOpen: false,
  menuOpen: false,
  logoutOpen: false,
};

let tipEl;
let clockTimer;
let logTimer;

function perms() {
  return state.me?.permissions || {};
}

function firstAllowedRoute() {
  const p = perms();
  if (p.dashboard) return "/";
  if (p.restore) return "/restore/vaultwarden";
  if (p.settings) return "/settings";
  return "/";
}

function routeAllowed(path) {
  const p = perms();
  if (path === "/" || path === "") return !!p.dashboard;
  if (path.startsWith("/schedule")) return !!p.schedule;
  if (path.startsWith("/restore")) return !!p.restore;
  if (path.startsWith("/settings")) return !!p.settings;
  if (path.startsWith("/logs")) return !!p.logs;
  return false;
}

function applyChrome() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.lang = state.locale;
  const icon = document.querySelector('link[rel="icon"][data-theme-icon]');
  if (icon) icon.href = brandLogoSrc();
}

function brandLogoSrc() {
  return state.theme === "light" ? "/static/brand/logo-light.svg" : "/static/brand/logo-dark.svg";
}

function headers(json = true) {
  const h = {};
  if (json) h.Accept = "application/json";
  if (state.basicAuth) h.Authorization = `Basic ${state.basicAuth}`;
  return h;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    redirect: "manual",
    headers: { ...headers(), ...(opts.headers || {}) },
  });
  const redirected = res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400);
  if (res.status === 401 || redirected) {
    state.me = null;
    throw Object.assign(new Error("unauthorized"), { status: 401 });
  }
  if (!res.ok) {
    const detail = await res.text();
    throw Object.assign(new Error(detail || res.statusText), { status: res.status });
  }
  if (res.status === 204) return null;
  return res.json();
}

function el(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function logoutHref() {
  return "/outpost.goauthentik.io/sign_out";
}

function doLogout() {
  localStorage.removeItem(PREF.basic);
  state.basicAuth = "";
  state.me = null;
  window.location.href = logoutHref();
}

function navIcon(name) {
  const icons = {
    dashboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 13h7V4H4v9zm9 7h7V4h-7v16zM4 20h7v-5H4v5z"/></svg>',
    schedule:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg>',
    restore:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3v10m0 0 3.5-3.5M12 13 8.5 9.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/></svg>',
    settings:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    logs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7 4h10v16H7z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    logout:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H4"/><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></svg>',
  };
  return icons[name] || "";
}

function ensureTooltip() {
  if (!tipEl) {
    tipEl = document.createElement("div");
    tipEl.id = "tooltip";
    tipEl.setAttribute("role", "tooltip");
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
  }
}

function hideTooltip() {
  if (!tipEl) return;
  tipEl.hidden = true;
  tipEl.classList.remove("show");
}

function showTooltip(anchor) {
  ensureTooltip();
  const text = anchor.getAttribute("data-tooltip");
  if (!text) return;
  if (!state.sidebarExpanded && !state.menuOpen && !anchor.hasAttribute("data-tooltip-always")) {
    /* mini sidebar: show */
  } else if (state.sidebarExpanded && anchor.getAttribute("data-tooltip-when") === "mini") {
    return;
  }
  tipEl.textContent = text;
  tipEl.hidden = false;
  const r = anchor.getBoundingClientRect();
  tipEl.style.left = `${Math.min(window.innerWidth - 12, r.right + 8)}px`;
  tipEl.style.top = `${Math.max(8, r.top + r.height / 2 - 12)}px`;
  requestAnimationFrame(() => tipEl.classList.add("show"));
}

function bindTooltips(root) {
  root.querySelectorAll("[data-tooltip]").forEach((node) => {
    node.addEventListener("mouseenter", () => showTooltip(node));
    node.addEventListener("mouseleave", hideTooltip);
    node.addEventListener("focus", () => showTooltip(node));
    node.addEventListener("blur", hideTooltip);
  });
}

function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, "", path);
  else history.pushState({}, "", path);
  state.route = path;
  state.menuOpen = false;
  render();
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

function workloadIconHtml(w) {
  const letter = escapeHtml((w.id || "?").slice(0, 2).toUpperCase());
  if (w.icon) {
    return `<img class="workload-icon" src="${escapeHtml(w.icon)}" alt="" width="44" height="44" loading="lazy" data-fallback="${letter}" />`;
  }
  return `<div class="workload-icon fallback" aria-hidden="true">${letter}</div>`;
}

function bindWorkloadIcons(root) {
  root.querySelectorAll("img.workload-icon[data-fallback]").forEach((img) => {
    img.addEventListener("error", () => {
      const d = document.createElement("div");
      d.className = "workload-icon fallback";
      d.setAttribute("aria-hidden", "true");
      d.textContent = img.dataset.fallback || "?";
      img.replaceWith(d);
    });
  });
}

function avatarHtml(size = 40) {
  const url = state.avatarUrl;
  const letter = escapeHtml((state.me?.username || "?").slice(0, 1).toUpperCase());
  if (url && /^https:\/\//i.test(url) && !/\.svg(\?|$)/i.test(url)) {
    return `<span class="avatar" style="width:${size}px;height:${size}px"><img src="${escapeHtml(url)}" alt="" /></span>`;
  }
  return `<span class="avatar" style="width:${size}px;height:${size}px">${letter}</span>`;
}

function clockText() {
  const now = new Date();
  return now.toLocaleString(state.locale === "de" ? "de-DE" : "en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shellStart(activePage) {
  const p = perms();
  const items = [
    p.dashboard && { id: "dashboard", path: "/", label: "navDashboard", icon: "dashboard" },
    p.schedule && { id: "schedule", path: "/schedule", label: "navSchedule", icon: "schedule" },
    p.restore && { id: "restore", path: "/restore/vaultwarden", label: "navRestore", icon: "restore" },
    p.settings && { id: "settings", path: "/settings", label: "navSettings", icon: "settings" },
    p.logs && { id: "logs", path: "/logs", label: "navLogs", icon: "logs" },
  ].filter(Boolean);

  const nav = items
    .map(
      (item) => `
      <button type="button" class="${activePage === item.id ? "active" : ""}" data-nav="${item.path}"
        data-tooltip="${escapeHtml(t(state.locale, item.label))}" data-tooltip-when="mini"
        aria-label="${escapeHtml(t(state.locale, item.label))}">
        ${navIcon(item.icon)}
        <span class="label">${escapeHtml(t(state.locale, item.label))}</span>
      </button>`,
    )
    .join("");

  const GROUP_CHIP_ALLOW = new Set(["podcraft_admins", "vaultwarden_admins"]);
  const groups = (state.me?.groups || [])
    .filter((g) => GROUP_CHIP_ALLOW.has(g))
    .map((g) => `<span class="chip">${escapeHtml(g)}</span>`)
    .join("") || `<span class="hint">—</span>`;

  return `
  <a class="skip-link" href="#main">${escapeHtml(t(state.locale, "skipToContent"))}</a>
  <div class="app ${state.sidebarExpanded ? "sidebar-expanded" : ""} ${state.menuOpen ? "menu-open" : ""}">
    <aside class="sidebar" id="sidebar" aria-label="Navigation">
      <button type="button" class="avatar-btn" id="avatarBtn" data-tooltip="${escapeHtml(t(state.locale, "tipUser"))}" data-tooltip-always
        aria-expanded="${state.userCardOpen}" aria-controls="userCard" aria-label="${escapeHtml(t(state.locale, "tipUser"))}">
        ${avatarHtml(40)}
      </button>
      <div class="user-card ${state.userCardOpen ? "open" : ""}" id="userCard">
        <strong>${escapeHtml(state.me?.display_name || state.me?.username || "")}</strong>
        <div class="hint">${escapeHtml(state.me?.email || state.me?.username || "")}</div>
        <div class="hint">${escapeHtml(t(state.locale, "groups"))}</div>
        <div class="groups">${groups}</div>
      </div>
      <nav class="nav">${nav}</nav>
      <div class="sidebar-foot">
        <button type="button" class="logout-btn" id="logoutBtn" data-tooltip="${escapeHtml(t(state.locale, "tipLogout"))}" data-tooltip-when="mini" aria-label="${escapeHtml(t(state.locale, "logout"))}">
          ${navIcon("logout")}
          <span class="label">${escapeHtml(t(state.locale, "logout"))}</span>
        </button>
        <button type="button" class="collapse-btn" id="collapseBtn"
          aria-expanded="${state.sidebarExpanded}"
          data-tooltip="${escapeHtml(t(state.locale, state.sidebarExpanded ? "navCollapse" : "navExpand"))}">
          <span aria-hidden="true">${state.sidebarExpanded ? "«" : "»"}</span>
          <span class="label">${escapeHtml(t(state.locale, state.sidebarExpanded ? "navCollapse" : "navExpand"))}</span>
        </button>
      </div>
    </aside>
    <div class="main-wrap">
      <header class="topbar">
        <div class="topbar-left">
          <button type="button" class="icon-btn menu-btn" id="menuBtn" aria-label="${escapeHtml(t(state.locale, "menuOpen"))}">☰</button>
          <img class="brand-mark" src="${brandLogoSrc()}" alt="podcraft" width="40" height="40" />
          ${state.showClock ? `<div class="headline-clock" id="headlineClock" aria-live="polite">${escapeHtml(clockText())}</div>` : `<strong>podcraft</strong>`}
        </div>
        <div class="top-actions">
          <button type="button" class="ghost-btn" id="langBtn" data-tooltip="${escapeHtml(t(state.locale, "tipLang"))}" data-tooltip-always>${state.locale.toUpperCase()}</button>
          <button type="button" class="icon-btn" id="themeBtn" data-tooltip="${escapeHtml(t(state.locale, "tipTheme"))}" data-tooltip-always>${state.theme === "light" ? "☀" : "☾"}</button>
        </div>
      </header>
      <main class="content" id="main">
        ${state.toast ? `<div class="toast" role="status">${escapeHtml(state.toast)}</div>` : ""}
        ${state.error ? `<div class="error-banner">${escapeHtml(state.error)}</div>` : ""}
`;
}

function shellEnd() {
  return `
      </main>
    </div>
  </div>
  ${
    state.logoutOpen
      ? `<div class="modal-backdrop" id="logoutModal" role="presentation">
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="logoutTitle">
            <h2 id="logoutTitle">${escapeHtml(t(state.locale, "logoutConfirmTitle"))}</h2>
            <p>${escapeHtml(t(state.locale, "logoutConfirmBody"))}</p>
            <div class="modal-actions">
              <button type="button" class="btn" id="logoutCancel">${escapeHtml(t(state.locale, "cancel"))}</button>
              <button type="button" class="btn danger" id="logoutConfirm">${escapeHtml(t(state.locale, "logout"))}</button>
            </div>
          </div>
        </div>`
      : ""
  }`;
}

function bindShell(root) {
  root.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.nav));
  });
  root.querySelector("#menuBtn")?.addEventListener("click", () => {
    state.menuOpen = !state.menuOpen;
    render();
  });
  root.querySelector("#collapseBtn")?.addEventListener("click", () => {
    state.sidebarExpanded = !state.sidebarExpanded;
    localStorage.setItem(PREF.sidebar, state.sidebarExpanded ? "1" : "0");
    render();
  });
  root.querySelector("#avatarBtn")?.addEventListener("click", () => {
    state.userCardOpen = !state.userCardOpen;
    render();
  });
  root.querySelector("#logoutBtn")?.addEventListener("click", () => {
    state.logoutOpen = true;
    render();
    queueMicrotask(() => root.querySelector("#logoutCancel")?.focus());
  });
  root.querySelector("#logoutCancel")?.addEventListener("click", () => {
    state.logoutOpen = false;
    render();
  });
  root.querySelector("#logoutConfirm")?.addEventListener("click", () => doLogout());
  root.querySelector("#langBtn")?.addEventListener("click", () => {
    state.locale = state.locale === "de" ? "en" : "de";
    localStorage.setItem(PREF.locale, state.locale);
    applyChrome();
    render();
  });
  root.querySelector("#themeBtn")?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem(PREF.theme, state.theme);
    applyChrome();
    render();
  });
  const modal = root.querySelector("#logoutModal");
  if (modal) {
    modal.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        state.logoutOpen = false;
        render();
      }
      if (e.key === "Tab") {
        const focusable = [...modal.querySelectorAll("button")];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }
  bindTooltips(root);
}

function renderLogin() {
  const root = document.getElementById("app");
  root.innerHTML = "";
  root.append(
    el(`
    <div class="login-shell">
      <div class="login-card">
        <img src="${brandLogoSrc()}" alt="" width="72" height="72" />
        <h1>podcraft</h1>
        <p class="hint">${escapeHtml(t(state.locale, "tagline"))}</p>
        <div class="login-actions">
          <a class="btn-oidc" href="/auth/start">
            <img src="/static/brand/authentik.svg" alt="" width="24" height="24" />
            <span>${escapeHtml(t(state.locale, "loginOidc"))}</span>
          </a>
          <div class="divider"><span>${escapeHtml(t(state.locale, "loginOr"))}</span></div>
          <form id="basic-form" class="form-grid" novalidate>
            <label>${escapeHtml(t(state.locale, "username"))}<input name="user" autocomplete="username" /></label>
            <label>${escapeHtml(t(state.locale, "password"))}<input name="pass" type="password" autocomplete="current-password" /></label>
            <button class="btn primary" type="submit">${escapeHtml(t(state.locale, "loginLocal"))}</button>
          </form>
          ${state.error ? `<p class="error-banner">${escapeHtml(state.error)}</p>` : ""}
        </div>
        <div class="top-actions" style="justify-content:center;margin-top:1rem">
          <button type="button" class="ghost-btn" id="langBtn">${state.locale.toUpperCase()}</button>
          <button type="button" class="icon-btn" id="themeBtn">${state.theme === "light" ? "☀" : "☾"}</button>
        </div>
      </div>
    </div>`),
  );
  root.querySelector("#basic-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const user = String(fd.get("user") || "").trim();
    const pass = String(fd.get("pass") || "");
    if (!user || !pass) {
      state.error = "Mock:/ local credentials required";
      renderLogin();
      return;
    }
    state.basicAuth = btoa(`${user}:${pass}`);
    localStorage.setItem(PREF.basic, state.basicAuth);
    state.error = "";
    await boot();
  });
  root.querySelector("#langBtn")?.addEventListener("click", () => {
    state.locale = state.locale === "de" ? "en" : "de";
    localStorage.setItem(PREF.locale, state.locale);
    applyChrome();
    renderLogin();
  });
  root.querySelector("#themeBtn")?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem(PREF.theme, state.theme);
    applyChrome();
    renderLogin();
  });
}

function pageDashboard() {
  const running = state.workloads.filter((w) => (w.desired || 0) > 0).length;
  const stopped = state.workloads.length - running;
  const rows = state.workloads
    .map((w) => {
      const on = w.desired > 0;
      const phase = w.phase || (on ? "Running" : "Stopped");
      return `
      <div class="workload-row">
        ${workloadIconHtml(w)}
        <div class="workload-id">
          <h3>${escapeHtml(w.id)}</h3>
          <p class="workload-meta">${escapeHtml(w.description || `${w.namespace}/${w.deployment}`)} · ${t(state.locale, "ready")} ${w.ready}/${w.desired}</p>
        </div>
        <span class="badge ${on ? "live" : "idle"}" data-tooltip="${escapeHtml(t(state.locale, "tipLive"))}">${escapeHtml(phaseLabel(phase))}</span>
        <div>
          ${
            on
              ? `<button class="icon-btn danger" data-action="stop" data-id="${escapeHtml(w.id)}" type="button" aria-label="${escapeHtml(t(state.locale, "stop"))}">■</button>`
              : `<button class="icon-btn primary" data-action="start" data-id="${escapeHtml(w.id)}" type="button" aria-label="${escapeHtml(t(state.locale, "start"))}">▶</button>`
          }
        </div>
      </div>`;
    })
    .join("");

  return `
    <section aria-label="${escapeHtml(t(state.locale, "navDashboard"))}">
      <div class="kpi-row">
        <div class="kpi"><div class="val">${state.workloads.length}</div><div class="lbl">${escapeHtml(t(state.locale, "kpiWorkloads"))}</div></div>
        <div class="kpi"><div class="val">${running}</div><div class="lbl">${escapeHtml(t(state.locale, "kpiRunning"))}</div></div>
        <div class="kpi"><div class="val">${stopped}</div><div class="lbl">${escapeHtml(t(state.locale, "kpiStopped"))}</div></div>
      </div>
      <article class="card">
        <h2>${escapeHtml(t(state.locale, "workloads"))}</h2>
        <div class="workload-list">${rows || `<p class="hint">${escapeHtml(t(state.locale, "loading"))}</p>`}</div>
      </article>
    </section>`;
}

function pageSchedule() {
  const active = !!state.schedule?.active_now;
  const status = active ? t(state.locale, "scheduleLive") : t(state.locale, "scheduleIdle");
  return `
    <section aria-label="${escapeHtml(t(state.locale, "navSchedule"))}">
      <article class="card">
        <p class="sr-only" id="scheduleSr">${escapeHtml(
          t(state.locale, "scheduleStatusSr", {
            status,
            start: state.schedule?.start || "—",
            end: state.schedule?.end || "—",
          }),
        )}</p>
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem">
          <span class="badge ${active ? "live" : "idle"}">${escapeHtml(status)}</span>
          <span class="hint">${escapeHtml(
            t(state.locale, "scheduleWindow", {
              start: state.schedule?.start || "—",
              end: state.schedule?.end || "—",
              tz: state.schedule?.timezone || "—",
            }),
          )}</span>
        </div>
        <h2>${escapeHtml(t(state.locale, "dayNight"))}</h2>
        <form id="schedule-form" class="form-grid">
          <div class="form-row">
            <label>${escapeHtml(t(state.locale, "startTime"))}<input name="start" type="time" value="${escapeHtml(state.schedule?.start || "06:30")}" /></label>
            <label>${escapeHtml(t(state.locale, "endTime"))}<input name="end" type="time" value="${escapeHtml(state.schedule?.end || "23:45")}" /></label>
          </div>
          <label>${escapeHtml(t(state.locale, "timezone"))}<input name="timezone" value="${escapeHtml(state.schedule?.timezone || "Europe/Berlin")}" /></label>
          <label>${escapeHtml(t(state.locale, "scheduleEnabled"))}
            <select name="enabled">
              <option value="true" ${state.schedule?.enabled ? "selected" : ""}>on</option>
              <option value="false" ${!state.schedule?.enabled ? "selected" : ""}>off</option>
            </select>
          </label>
          <button class="btn primary" type="submit">${escapeHtml(t(state.locale, "save"))}</button>
        </form>
      </article>
    </section>`;
}

function pageRestore() {
  const archives = [
    `<button type="button" class="archive-item ${state.selectedArchive === "latest" ? "selected" : ""}" data-archive="latest">
      <span>${escapeHtml(t(state.locale, "restoreLatest"))}</span><span class="hint">auto</span>
    </button>`,
    ...state.archives.map(
      (a) => `<button type="button" class="archive-item ${state.selectedArchive === a.name ? "selected" : ""}" data-archive="${escapeHtml(a.name)}">
        <span>${escapeHtml(a.name)}</span><span class="hint">${escapeHtml(a.size_h)}</span>
      </button>`,
    ),
  ].join("");

  const jobRow = (j) =>
    `<div class="job-item"><span>${escapeHtml(j.name)}</span><span class="hint">${escapeHtml(j.status)} · ${escapeHtml(j.archive)}</span></div>`;

  return `
    <section aria-label="${escapeHtml(t(state.locale, "restoreTitle"))}">
      <div class="restore-layout">
        <div>
          <article class="card">
            <h2>${escapeHtml(t(state.locale, "restoreArchives"))}</h2>
            <div class="archive-list" id="archiveList">${archives || `<p class="hint">${escapeHtml(t(state.locale, "restoreEmpty"))}</p>`}</div>
            <form id="restore-form" class="form-grid" style="margin-top:1rem">
              <label><input type="checkbox" name="force" /> ${escapeHtml(t(state.locale, "restoreForce"))}</label>
              <label>${escapeHtml(t(state.locale, "restoreConfirm"))}<input name="confirm" autocomplete="off" placeholder="RESTORE" /></label>
              <button class="btn primary" type="submit">${escapeHtml(t(state.locale, "restoreStart"))}</button>
            </form>
          </article>
          <article class="card">
            <h2>${escapeHtml(t(state.locale, "restoreJobs"))}</h2>
            <div class="hint">${escapeHtml(t(state.locale, "restoreActive"))}</div>
            <div class="job-list">${(state.jobs.active || []).map(jobRow).join("") || "—"}</div>
            <div class="hint" style="margin-top:0.75rem">${escapeHtml(t(state.locale, "restoreRecent"))}</div>
            <div class="job-list">${(state.jobs.recent || []).map(jobRow).join("") || "—"}</div>
          </article>
        </div>
        <article class="card">
          <h2>Job logs</h2>
          <div class="log-box" id="restoreLog">${escapeHtml(state.jobs.active?.[0]?.logs || state.selectedJobLogs || "")}</div>
        </article>
      </div>
    </section>`;
}

function pageSettings() {
  const once = state.haBasicOnce;
  const passShown = state.haPassVisible && once?.password;
  return `
    <section aria-label="${escapeHtml(t(state.locale, "settings"))}">
      <article class="card">
        <h2>${escapeHtml(t(state.locale, "settings"))}</h2>
        <form id="settings-form" class="form-grid">
          <label><input type="checkbox" name="showClock" ${state.showClock ? "checked" : ""} /> ${escapeHtml(t(state.locale, "showClock"))}</label>
          <label>${escapeHtml(t(state.locale, "avatarUrl"))}<input name="avatarUrl" type="url" value="${escapeHtml(state.avatarUrl)}" placeholder="https://…" /></label>
          <p class="hint">${escapeHtml(t(state.locale, "avatarHelp"))}</p>
          <p class="hint">${escapeHtml(t(state.locale, "authHint"))}: ${escapeHtml(state.me?.configured_auth_mode || "—")} · ${escapeHtml(t(state.locale, "version"))}: ${escapeHtml(state.me?.version || "—")}</p>
          <button class="btn primary" type="submit">${escapeHtml(t(state.locale, "save"))}</button>
        </form>
      </article>
      ${
        perms().ha
          ? `<article class="card">
              <h2>${escapeHtml(t(state.locale, "haApiTitle"))}</h2>
              <p class="hint">${escapeHtml(t(state.locale, "haApiHelp"))}</p>
              <button class="btn" type="button" id="ha-rotate">${escapeHtml(t(state.locale, "haApiRotate"))}</button>
              ${
                once
                  ? `<div class="form-grid" style="margin-top:0.75rem">
                      <p class="hint">${escapeHtml(t(state.locale, "haApiOnceHint"))}</p>
                      <label>${escapeHtml(t(state.locale, "username"))}<input readonly id="ha-user" value="${escapeHtml(once.username)}" /></label>
                      <label>${escapeHtml(t(state.locale, "password"))}<input readonly id="ha-pass" type="${passShown ? "text" : "password"}" value="${escapeHtml(once.password)}" class="mono" /></label>
                      <div class="top-actions">
                        <button type="button" class="ghost-btn" id="ha-toggle">${escapeHtml(t(state.locale, passShown ? "haApiHidePass" : "haApiShowPass"))}</button>
                      </div>
                    </div>`
                  : ""
              }
            </article>`
          : ""
      }
    </section>`;
}

function pageLogs() {
  return `
    <section aria-label="${escapeHtml(t(state.locale, "logs"))}">
      <article class="card">
        <div class="top-actions" style="justify-content:space-between;margin-bottom:0.75rem">
          <h2 style="margin:0">${escapeHtml(t(state.locale, "logs"))}</h2>
          <div class="top-actions">
            <button type="button" class="ghost-btn" id="log-pause">${escapeHtml(t(state.locale, state.logPaused ? "resume" : "pause"))}</button>
            <button type="button" class="ghost-btn" id="log-clear">${escapeHtml(t(state.locale, "clear"))}</button>
          </div>
        </div>
        <div class="log-box" id="log-body" role="log" tabindex="0"></div>
      </article>
    </section>`;
}

function activePageId() {
  const path = state.route;
  if (path.startsWith("/schedule")) return "schedule";
  if (path.startsWith("/restore")) return "restore";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/logs")) return "logs";
  return "dashboard";
}

function renderApp() {
  if (!routeAllowed(state.route)) {
    state.toast = t(state.locale, "forbiddenToast");
    navigate(firstAllowedRoute(), { replace: true });
    return;
  }

  const page = activePageId();
  let body = "";
  if (page === "dashboard") body = pageDashboard();
  else if (page === "schedule") body = pageSchedule();
  else if (page === "restore") body = pageRestore();
  else if (page === "settings") body = pageSettings();
  else if (page === "logs") body = pageLogs();

  const root = document.getElementById("app");
  root.innerHTML = shellStart(page) + body + shellEnd();
  bindShell(root);
  bindWorkloadIcons(root);

  root.querySelectorAll("[data-action=start],[data-action=stop]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/api/v1/workloads/${btn.dataset.id}/${btn.dataset.action}`, { method: "POST" });
        await refreshWorkloads();
        render();
      } catch (err) {
        state.error = String(err.message || err);
        render();
      }
    });
  });

  root.querySelector("#schedule-form")?.addEventListener("submit", async (e) => {
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
    render();
  });

  root.querySelectorAll("[data-archive]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedArchive = btn.dataset.archive;
      render();
    });
  });

  root.querySelector("#restore-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    state.error = "";
    try {
      const out = await api("/api/v1/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({
          archive: state.selectedArchive || "latest",
          confirm: String(fd.get("confirm") || ""),
          force: fd.get("force") === "on",
        }),
      });
      await refreshRestore();
      if (out?.job) {
        const job = await api(`/api/v1/restore/jobs/${out.job}`);
        state.selectedJobLogs = job?.logs || "";
      }
      render();
    } catch (err) {
      state.error = String(err.message || err);
      render();
    }
  });

  root.querySelector("#settings-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    state.showClock = fd.get("showClock") === "on";
    localStorage.setItem(PREF.clock, state.showClock ? "1" : "0");
    const url = String(fd.get("avatarUrl") || "").trim();
    if (url && (!/^https:\/\//i.test(url) || /\.svg(\?|$)/i.test(url))) {
      state.error = "Avatar URL must be https and not SVG";
      render();
      return;
    }
    state.avatarUrl = url;
    localStorage.setItem(PREF.avatar, url);
    state.error = "";
    render();
  });

  root.querySelector("#ha-rotate")?.addEventListener("click", async () => {
    try {
      const data = await api("/api/v1/auth/ha-basic/rotate", { method: "POST" });
      state.haBasicOnce = { username: data.username, password: data.password };
      state.haPassVisible = false;
      render();
    } catch (err) {
      state.error = String(err.message || err);
      render();
    }
  });
  root.querySelector("#ha-toggle")?.addEventListener("click", () => {
    state.haPassVisible = !state.haPassVisible;
    render();
  });

  root.querySelector("#log-pause")?.addEventListener("click", () => {
    state.logPaused = !state.logPaused;
    render();
  });
  root.querySelector("#log-clear")?.addEventListener("click", async () => {
    await api("/api/v1/logs", { method: "DELETE" });
    const body = document.getElementById("log-body");
    if (body) body.textContent = "";
  });

  if (page === "logs") refreshLogBody();
  tickClock();
}

function render() {
  if (!state.me) {
    renderLogin();
    return;
  }
  renderApp();
}

async function refreshWorkloads() {
  if (perms().dashboard) {
    state.workloads = await api("/api/v1/workloads");
  }
}

async function refreshSchedule() {
  if (perms().schedule) {
    state.schedule = await api("/api/v1/schedule");
  }
}

async function refreshRestore() {
  if (!perms().restore) return;
  state.archives = await api("/api/v1/restore/archives");
  state.jobs = await api("/api/v1/restore/jobs");
  const first = state.jobs.active?.[0];
  if (first?.name) {
    try {
      const detail = await api(`/api/v1/restore/jobs/${first.name}`);
      state.selectedJobLogs = detail.logs || "";
      if (state.jobs.active[0]) state.jobs.active[0].logs = detail.logs;
    } catch {
      /* ignore */
    }
  }
}

async function refreshLogBody() {
  if (!perms().logs || state.logPaused) return;
  try {
    const data = await api("/api/v1/logs?limit=200");
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
}

function tickClock() {
  const node = document.getElementById("headlineClock");
  if (node) node.textContent = clockText();
}

async function refreshData() {
  state.me = await api("/api/v1/me");
  await Promise.all([refreshWorkloads(), refreshSchedule(), refreshRestore()]);
}

async function boot() {
  applyChrome();
  state.route = location.pathname;
  try {
    await refreshData();
    state.error = "";
    if (!routeAllowed(state.route)) {
      state.toast = t(state.locale, "forbiddenToast");
      navigate(firstAllowedRoute(), { replace: true });
    } else {
      render();
    }
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(tickClock, 30_000);
    if (logTimer) clearInterval(logTimer);
    logTimer = setInterval(() => {
      if (activePageId() === "logs") refreshLogBody();
    }, 4000);
  } catch (err) {
    if (err.status === 401) {
      renderLogin();
      return;
    }
    state.error = String(err.message || err);
    renderLogin();
  }
}

window.addEventListener("popstate", () => {
  state.route = location.pathname;
  render();
});
boot();
