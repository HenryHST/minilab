import { normalizeLocale, t } from "./i18n.js";
import {
  archiveDateKey,
  archivesForDate,
  backupDateSet,
  buildCalendarMarkup,
  parseSizeMb,
} from "./calendar.js";
import { paintScheduleClock, parseHm, scheduleClockShellHtml } from "./schedule-clock.js";
import { timezoneSelectHtml } from "./timezones.js";

const PREF = {
  locale: "podcraft.locale",
  theme: "podcraft.theme",
  sidebar: "podcraft.sidebarExpanded",
  clock: "podcraft.showClock",
  avatar: "podcraft.avatarUrl",
  avatarPos: "podcraft.avatarPos",
  weeks: "podcraft.showWeekNumbers",
  selTheme: "podcraft.selTheme",
  logoAnim: "podcraft.logoAnim",
  docs: "podcraft.showDocs",
  basic: "podcraft.basic",
};

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AVATAR_MAX_DIM = 512;
const LOGO_MODES = ["setsail", "float", "parallax"];
const GROUP_CHIP_ALLOW = new Set(["podcraft_admins", "vaultwarden_admins"]);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktopMq = window.matchMedia("(min-width: 821px)");

function loadAvatarPos() {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF.avatarPos) || "{}");
    const x = Number(raw.x);
    const y = Number(raw.y);
    return {
      x: Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 50,
      y: Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : 50,
    };
  } catch {
    return { x: 50, y: 50 };
  }
}

const state = {
  locale: normalizeLocale(localStorage.getItem(PREF.locale) || navigator.language?.slice(0, 2)),
  theme: localStorage.getItem(PREF.theme) || "dark",
  sidebarExpanded: localStorage.getItem(PREF.sidebar) === "1",
  showClock: localStorage.getItem(PREF.clock) !== "0",
  showWeekNumbers: localStorage.getItem(PREF.weeks) !== "0",
  selTheme: localStorage.getItem(PREF.selTheme) === "b" ? "b" : "a",
  logoAnim: LOGO_MODES.includes(localStorage.getItem(PREF.logoAnim) || "")
    ? localStorage.getItem(PREF.logoAnim)
    : "setsail",
  showDocs: localStorage.getItem(PREF.docs) !== "0",
  avatarUrl: localStorage.getItem(PREF.avatar) || "",
  avatarPos: loadAvatarPos(),
  me: null,
  schedule: null,
  workloads: [],
  archives: [],
  jobs: { active: [], recent: [] },
  selectedArchive: "latest",
  selectedBackupDate: "",
  dayFilter: "",
  calCursor: null,
  restoreForce: false,
  restoreConfirm: "",
  selectedJobName: "",
  selectedJobLogs: "",
  basicAuth: localStorage.getItem(PREF.basic) || "",
  route: location.pathname,
  error: "",
  toast: "",
  logPaused: false,
  haBasicOnce: null,
  haPassVisible: false,
  userCardOpen: false,
  expandForUser: false,
  menuOpen: false,
  logoutOpen: false,
  avatarEdit: null,
  kpiAnimate: true,
  logoPlay: false,
  pendingFocus: "",
  lab: null,
  labMetricsSample: "",
  labMetricsLoaded: false,
  labChaosOut: "",
  labMetricsOpen: false,
  settingsTab: "profil",
  archiveQuery: "",
  logQuery: "",
  logLevelFilter: "ALL",
  logItems: [],
};

let tipEl;
let clockTimer;
let logTimer;
let restoreTimer;
let restorePolling = false;
let scheduleClockTimer;
let toastTimer;

/* ───────────────────────── helpers ───────────────────────── */

function perms() {
  return state.me?.permissions || {};
}

function loc() {
  return state.locale === "de" ? "de-DE" : "en-GB";
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
  if (path.startsWith("/podinfo")) return !!p.podinfo;
  if (path.startsWith("/docs")) return !!p.docs && state.showDocs;
  return false;
}

function applyChrome() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.selTheme = state.selTheme;
  document.documentElement.lang = state.locale;
  const teal = state.selTheme === "a";
  document.documentElement.style.setProperty("--accent", teal ? "#0f766e" : "#1d4ed8");
  document.documentElement.style.setProperty(
    "--accent-soft",
    teal ? "rgba(15, 118, 110, 0.18)" : "rgba(29, 78, 216, 0.16)",
  );
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
  return "/auth/logout";
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
    podinfo:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3 4 7v10l8 4 8-4V7l-8-4z"/><path d="M12 12 4 7m8 5 8-5M12 12v10"/></svg>',
    docs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M14 4v4h4M8 12h8M8 16h8M8 8h3"/></svg>',
    logout:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H4"/><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></svg>',
  };
  return icons[name] || "";
}

/* ───────────────────────── tooltips ───────────────────────── */

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
  if (isExpanded() && anchor.getAttribute("data-tooltip-when") === "mini") return;
  tipEl.textContent = text;
  tipEl.hidden = false;
  const r = anchor.getBoundingClientRect();
  tipEl.style.left = `${Math.min(window.innerWidth - 12, r.right + 8)}px`;
  tipEl.style.top = `${Math.max(8, r.top + r.height / 2 - 12)}px`;
  requestAnimationFrame(() => tipEl.classList.add("show"));
}

function bindTooltips(root) {
  root.querySelectorAll("[data-tooltip]").forEach((node) => {
    if (node._tipBound) return;
    node._tipBound = true;
    node.addEventListener("mouseenter", () => showTooltip(node));
    node.addEventListener("mouseleave", hideTooltip);
    node.addEventListener("focus", () => showTooltip(node));
    node.addEventListener("blur", hideTooltip);
  });
}

/* ───────────────────────── navigation ───────────────────────── */

function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, "", path);
  else history.pushState({}, "", path);
  state.route = path;
  state.menuOpen = false;
  state.kpiAnimate = true;
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

/* ───────────────────────── avatar ───────────────────────── */

function isAvatarSrcOk(url) {
  if (!url) return false;
  if (/^data:image\/(jpeg|png|webp|gif);base64,/i.test(url)) return true;
  return /^https:\/\//i.test(url) && !/\.svg(\?|$)/i.test(url);
}

function avatarImgHtml(src, pos) {
  return `<img src="${escapeHtml(src)}" alt="" draggable="false" style="${avatarFrameStyle(pos)}" />`;
}

function avatarHtml(size = 40) {
  const url = state.avatarUrl;
  const letter = escapeHtml((state.me?.username || "?").slice(0, 1).toUpperCase());
  if (isAvatarSrcOk(url)) {
    return `<span class="avatar" style="width:${size}px;height:${size}px">${avatarImgHtml(url, state.avatarPos)}</span>`;
  }
  return `<span class="avatar" style="width:${size}px;height:${size}px">${letter}</span>`;
}

function userCardAvatarHtml() {
  const letter = escapeHtml((state.me?.username || "?").slice(0, 1).toUpperCase());
  if (isAvatarSrcOk(state.avatarUrl)) {
    return `<span class="user-card-avatar">${avatarImgHtml(state.avatarUrl, state.avatarPos)}</span>`;
  }
  return `<span class="user-card-avatar" aria-hidden="true">${letter}</span>`;
}

function ensureAvatarEdit() {
  if (!state.avatarEdit) {
    state.avatarEdit = { src: state.avatarUrl, pos: { ...state.avatarPos }, error: "" };
  }
  return state.avatarEdit;
}

/** Zoom so square avatars still have crop room; object-position alone is a no-op then. */
const AVATAR_ZOOM = 1.35;

function avatarFrameStyle(pos) {
  const z = AVATAR_ZOOM;
  const x = clampPct(pos?.x ?? 50) / 100;
  const y = clampPct(pos?.y ?? 50) / 100;
  const left = (1 - z) * x * 100;
  const top = (1 - z) * y * 100;
  return `width:${z * 100}%;height:${z * 100}%;max-width:none;position:absolute;left:${left}%;top:${top}%;object-fit:cover;`;
}

function applyAvatarFrame(img, pos) {
  if (!img) return;
  const z = AVATAR_ZOOM;
  const x = clampPct(pos?.x ?? 50) / 100;
  const y = clampPct(pos?.y ?? 50) / 100;
  img.style.width = `${z * 100}%`;
  img.style.height = `${z * 100}%`;
  img.style.maxWidth = "none";
  img.style.position = "absolute";
  img.style.left = `${(1 - z) * x * 100}%`;
  img.style.top = `${(1 - z) * y * 100}%`;
  img.style.objectFit = "cover";
  img.style.objectPosition = "50% 50%";
}

function clampPct(n) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Read an image file and downscale it so it fits comfortably into localStorage. */
function readAvatarFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const original = String(reader.result || "");
      const img = new Image();
      img.onerror = () => reject(new Error("read"));
      img.onload = () => {
        const maxSide = Math.max(img.naturalWidth, img.naturalHeight);
        if (maxSide <= AVATAR_MAX_DIM && file.size <= 400 * 1024) {
          resolve(original);
          return;
        }
        const scale = Math.min(1, AVATAR_MAX_DIM / maxSide);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(original);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.9));
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  });
}

/* ───────────────────────── brand logo ───────────────────────── */

function brandLogoHtml() {
  const tips = {
    setsail: "logoTipSetsail",
    float: "logoTipFloat",
    parallax: "logoTipParallax",
  };
  return `
  <button type="button" class="brand-logo" id="brandLogo" data-parallax="${state.logoAnim === "parallax" ? "1" : "0"}"
    data-tooltip="${escapeHtml(t(state.locale, tips[state.logoAnim]))}" data-tooltip-always aria-label="podcraft">
    <div class="brand-logo-scene" id="brandLogoScene" data-logo-anim="${state.logoAnim}">
      <svg class="logo-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="logoTileGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <linearGradient id="logoCyanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#67e8f9"/><stop offset="55%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#0891b2"/>
          </linearGradient>
          <filter id="logoSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#020617" flood-opacity="0.55"/>
          </filter>
        </defs>
        <g class="logo-layer logo-layer-tile"><rect width="64" height="64" rx="14" fill="url(#logoTileGrad)"/></g>
        <g class="logo-layer logo-layer-water" filter="url(#logoSoftShadow)">
          <path fill="none" stroke="url(#logoCyanGrad)" stroke-width="2.25" stroke-linecap="round" d="M16 50h32"/>
        </g>
        <g class="logo-layer logo-layer-hull" filter="url(#logoSoftShadow)"><path fill="url(#logoCyanGrad)" d="M18 38h28l-3 8H21l-3-8z"/></g>
        <g class="logo-layer logo-layer-sail" filter="url(#logoSoftShadow)"><path fill="url(#logoCyanGrad)" d="M22 36 30 18l4 10 6-8 3 16H22z"/></g>
      </svg>
    </div>
  </button>`;
}

function logoParts() {
  const scene = document.getElementById("brandLogoScene");
  if (!scene) return null;
  return {
    scene,
    logo: document.getElementById("brandLogo"),
    layers: {
      tile: scene.querySelector(".logo-layer-tile"),
      water: scene.querySelector(".logo-layer-water"),
      hull: scene.querySelector(".logo-layer-hull"),
      sail: scene.querySelector(".logo-layer-sail"),
    },
  };
}

function clearLogoInline(parts) {
  parts.scene.style.transform = "";
  parts.scene.style.boxShadow = "";
  Object.values(parts.layers).forEach((n) => {
    if (n) n.style.transform = "";
  });
}

function resetLogoParallax() {
  const parts = logoParts();
  if (!parts || state.logoAnim !== "parallax" || reduceMotion) return;
  parts.scene.style.transform = "rotateY(-18deg) rotateX(12deg) scale3d(1,1,1)";
  parts.scene.style.boxShadow =
    "0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent), 6px 10px 18px rgba(2, 6, 23, 0.5)";
  parts.layers.tile.style.transform = "translate3d(0,0,0)";
  parts.layers.water.style.transform = "translate3d(0,0,12px)";
  parts.layers.hull.style.transform = "translate3d(0,0,22px)";
  parts.layers.sail.style.transform = "translate3d(0,0,34px)";
}

function applyLogoParallax(clientX, clientY) {
  if (state.logoAnim !== "parallax" || reduceMotion) return;
  const parts = logoParts();
  if (!parts || parts.scene.classList.contains("logo-setsail-play")) return;
  const bar = document.querySelector(".topbar")?.getBoundingClientRect() || parts.logo.getBoundingClientRect();
  const logo = parts.logo.getBoundingClientRect();
  const cx = logo.left + logo.width / 2;
  const cy = logo.top + logo.height / 2;
  const nx = Math.max(-1, Math.min(1, (clientX - cx) / Math.max(bar.width * 0.42, 120)));
  const ny = Math.max(-1, Math.min(1, (clientY - cy) / Math.max(bar.height * 0.7, 28)));
  const lift = 1 + Math.abs(nx) * 0.06 + Math.abs(ny) * 0.04;
  parts.scene.style.transform = `rotateY(${-18 + nx * 38}deg) rotateX(${12 - ny * 28}deg) scale3d(${lift}, ${lift}, 1)`;
  parts.scene.style.boxShadow = `${6 + nx * 8}px ${10 - ny * 6}px 22px rgba(2, 6, 23, 0.55)`;
  parts.layers.tile.style.transform = `translate3d(${nx}px, ${ny * 0.8}px, 0)`;
  parts.layers.water.style.transform = `translate3d(${nx * 5}px, ${ny * 3.5}px, ${12 + Math.abs(nx) * 4}px)`;
  parts.layers.hull.style.transform = `translate3d(${nx * 9}px, ${ny * 6}px, ${22 + Math.abs(nx) * 6}px)`;
  parts.layers.sail.style.transform = `translate3d(${nx * 14}px, ${ny * 9}px, ${34 + Math.abs(nx) * 10}px) rotateZ(${nx * -8}deg)`;
}

/** One-shot "set sail" overlay; works in every animation mode. */
function playLogoSetSail() {
  if (reduceMotion) return;
  const parts = logoParts();
  if (!parts) return;
  const { scene } = parts;
  scene.classList.remove("logo-setsail-play");
  void scene.offsetWidth;
  clearLogoInline(parts);
  scene.classList.add("logo-setsail-play");
  const onEnd = (e) => {
    if (e.target !== scene) return;
    scene.classList.remove("logo-setsail-play");
    scene.removeEventListener("animationend", onEnd);
    resetLogoParallax();
  };
  scene.addEventListener("animationend", onEnd);
}

function bindBrandLogo(root) {
  root.querySelector("#brandLogo")?.addEventListener("click", () => playLogoSetSail());
  if (state.logoAnim === "parallax") resetLogoParallax();
}

let parallaxActive = false;
document.addEventListener("pointermove", (e) => {
  if (state.logoAnim !== "parallax" || !state.me) return;
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  const r = topbar.getBoundingClientRect();
  const inside = e.clientY >= r.top && e.clientY <= r.bottom;
  if (inside) {
    parallaxActive = true;
    applyLogoParallax(e.clientX, e.clientY);
  } else if (parallaxActive) {
    parallaxActive = false;
    resetLogoParallax();
  }
});

/* ───────────────────────── shell ───────────────────────── */

function isExpanded() {
  return state.sidebarExpanded || state.expandForUser;
}

function clockText() {
  const now = new Date();
  return now.toLocaleString(loc(), {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function allowedGroups() {
  return (state.me?.groups || []).filter((g) => GROUP_CHIP_ALLOW.has(g));
}

function shellStart(activePage) {
  const p = perms();
  const items = [
    p.dashboard && { id: "dashboard", path: "/", label: "navDashboard", icon: "dashboard" },
    p.schedule && { id: "schedule", path: "/schedule", label: "navSchedule", icon: "schedule" },
    p.restore && { id: "restore", path: "/restore/vaultwarden", label: "navRestore", icon: "restore" },
    p.settings && { id: "settings", path: "/settings", label: "navSettings", icon: "settings" },
    p.logs && { id: "logs", path: "/logs", label: "navLogs", icon: "logs" },
    p.podinfo && { id: "podinfo", path: "/podinfo", label: "navPodinfo", icon: "podinfo" },
    p.docs &&
      state.showDocs && { id: "docs", path: "/docs", label: "navDocs", icon: "docs" },
  ].filter(Boolean);

  const nav = items
    .map(
      (item) => `
      <button type="button" class="${activePage === item.id ? "active" : ""}" data-nav="${item.path}"
        data-tooltip="${escapeHtml(t(state.locale, item.label))}" data-tooltip-when="mini"
        ${activePage === item.id ? 'aria-current="page"' : ""}
        aria-label="${escapeHtml(t(state.locale, item.label))}">
        ${navIcon(item.icon)}
        <span class="label">${escapeHtml(t(state.locale, item.label))}</span>
      </button>`,
    )
    .join("");

  const groups =
    allowedGroups()
      .map((g) => `<span class="chip">${escapeHtml(g)}</span>`)
      .join("") || `<span class="hint">—</span>`;

  const expanded = isExpanded();
  return `
  <a class="skip-link" href="#main">${escapeHtml(t(state.locale, "skipToContent"))}</a>
  <div class="app ${expanded ? "sidebar-expanded" : ""} ${state.menuOpen ? "menu-open" : ""}">
    ${
      state.menuOpen
        ? `<button type="button" class="drawer-backdrop" id="drawerBackdrop" tabindex="-1" aria-label="${escapeHtml(t(state.locale, "drawerBackdrop"))}"></button>`
        : ""
    }
    <aside class="sidebar" id="sidebar" aria-label="Navigation">
      <button type="button" class="icon-btn drawer-close" id="drawerClose" aria-label="${escapeHtml(t(state.locale, "menuClose"))}">✕</button>
      <button type="button" class="avatar-btn" id="avatarBtn" data-tooltip="${escapeHtml(t(state.locale, "tipUser"))}" data-tooltip-always
        aria-expanded="${state.userCardOpen}" aria-controls="userCard" aria-label="${escapeHtml(t(state.locale, "tipUser"))}">
        ${avatarHtml(40)}
      </button>
      <div class="user-card ${state.userCardOpen ? "open" : ""}" id="userCard" role="region" aria-label="${escapeHtml(t(state.locale, "user"))}">
        ${userCardAvatarHtml()}
        <strong>${escapeHtml(state.me?.display_name || state.me?.username || "")}</strong>
        <div class="hint">${escapeHtml(state.me?.email || state.me?.username || "")}</div>
        <div class="hint">${escapeHtml(t(state.locale, "groups"))}</div>
        <div class="groups">${groups}</div>
        <div class="user-card-actions">
          ${p.settings ? `<button type="button" class="btn primary" id="ucSettings">${escapeHtml(t(state.locale, "settings"))}</button>` : ""}
          <button type="button" class="btn" id="ucClose">${escapeHtml(t(state.locale, "userCardClose"))}</button>
        </div>
      </div>
      <nav class="nav">${nav}</nav>
      <div class="sidebar-foot">
        <button type="button" class="logout-btn" id="logoutBtn" data-tooltip="${escapeHtml(t(state.locale, "tipLogout"))}" data-tooltip-when="mini" aria-label="${escapeHtml(t(state.locale, "logout"))}">
          ${navIcon("logout")}
          <span class="label">${escapeHtml(t(state.locale, "logout"))}</span>
        </button>
        <button type="button" class="collapse-btn" id="collapseBtn"
          aria-expanded="${expanded}"
          data-tooltip="${escapeHtml(t(state.locale, expanded ? "navCollapse" : "navExpand"))}">
          <span aria-hidden="true">${expanded ? "«" : "»"}</span>
          <span class="label">${escapeHtml(t(state.locale, expanded ? "navCollapse" : "navExpand"))}</span>
        </button>
      </div>
    </aside>
    <div class="main-wrap">
      <header class="topbar">
        <div class="topbar-left">
          <button type="button" class="icon-btn menu-btn" id="menuBtn" aria-expanded="${state.menuOpen}" aria-controls="sidebar" aria-label="${escapeHtml(t(state.locale, "menuOpen"))}">☰</button>
          ${brandLogoHtml()}
          ${state.showClock ? `<div class="headline-clock" id="headlineClock" aria-live="off">${escapeHtml(clockText())}</div>` : `<strong>podcraft</strong>`}
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

function openUserCard() {
  state.userCardOpen = true;
  if (!state.sidebarExpanded && desktopMq.matches) state.expandForUser = true;
  state.pendingFocus = "#ucClose";
  render();
}

function closeUserCard({ focus = true } = {}) {
  if (!state.userCardOpen && !state.expandForUser) return;
  state.userCardOpen = false;
  state.expandForUser = false;
  if (focus) state.pendingFocus = "#avatarBtn";
  render();
}

function openMenu() {
  state.menuOpen = true;
  state.pendingFocus = "#drawerClose";
  render();
}

function closeMenu({ focus = true } = {}) {
  if (!state.menuOpen) return;
  state.menuOpen = false;
  if (focus) state.pendingFocus = "#menuBtn";
  render();
}

function focusableIn(container) {
  return [
    ...container.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((n) => n.offsetParent !== null || n === document.activeElement);
}

function trapTab(e, container) {
  const list = focusableIn(container);
  if (!list.length) return;
  const first = list[0];
  const last = list[list.length - 1];
  const active = document.activeElement;
  if (!container.contains(active)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

document.addEventListener("keydown", (e) => {
  if (!state.me) return;
  if (e.key === "Escape") {
    if (state.logoutOpen) {
      state.logoutOpen = false;
      state.pendingFocus = "#logoutBtn";
      render();
      return;
    }
    if (state.menuOpen) {
      closeMenu();
      return;
    }
    if (state.userCardOpen) closeUserCard();
    return;
  }
  if (e.key === "Tab") {
    const modal = document.getElementById("logoutModal");
    if (modal) {
      trapTab(e, modal);
      return;
    }
    if (state.menuOpen) {
      const sidebar = document.getElementById("sidebar");
      if (sidebar) trapTab(e, sidebar);
    }
  }
});

function bindShell(root) {
  root.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.nav));
  });
  root.querySelector("#menuBtn")?.addEventListener("click", () => (state.menuOpen ? closeMenu() : openMenu()));
  root.querySelector("#drawerBackdrop")?.addEventListener("click", () => closeMenu());
  root.querySelector("#drawerClose")?.addEventListener("click", () => closeMenu());
  root.querySelector("#collapseBtn")?.addEventListener("click", () => {
    if (state.expandForUser) {
      state.userCardOpen = false;
      state.expandForUser = false;
    } else {
      state.sidebarExpanded = !state.sidebarExpanded;
      localStorage.setItem(PREF.sidebar, state.sidebarExpanded ? "1" : "0");
    }
    state.pendingFocus = "#collapseBtn";
    render();
  });
  root.querySelector("#avatarBtn")?.addEventListener("click", () => {
    if (state.userCardOpen) closeUserCard();
    else openUserCard();
  });
  root.querySelector("#ucClose")?.addEventListener("click", () => closeUserCard());
  root.querySelector("#ucSettings")?.addEventListener("click", () => {
    state.userCardOpen = false;
    state.expandForUser = false;
    navigate("/settings");
  });
  root.querySelector("#logoutBtn")?.addEventListener("click", () => {
    state.logoutOpen = true;
    state.pendingFocus = "#logoutCancel";
    render();
  });
  root.querySelector("#logoutCancel")?.addEventListener("click", () => {
    state.logoutOpen = false;
    state.pendingFocus = "#logoutBtn";
    render();
  });
  root.querySelector("#logoutConfirm")?.addEventListener("click", () => doLogout());
  root.querySelector("#logoutModal")?.addEventListener("click", (e) => {
    if (e.target.id === "logoutModal") {
      state.logoutOpen = false;
      state.pendingFocus = "#logoutBtn";
      render();
    }
  });
  root.querySelector("#langBtn")?.addEventListener("click", () => {
    state.locale = state.locale === "de" ? "en" : "de";
    localStorage.setItem(PREF.locale, state.locale);
    applyChrome();
    state.pendingFocus = "#langBtn";
    render();
  });
  root.querySelector("#themeBtn")?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem(PREF.theme, state.theme);
    applyChrome();
    state.pendingFocus = "#themeBtn";
    render();
  });
  bindBrandLogo(root);
  bindTooltips(root);
}

/* ───────────────────────── login ───────────────────────── */

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

/* ───────────────────────── dashboard ───────────────────────── */

function windowPercent(start, end) {
  const s = parseHm(start);
  const e = parseHm(end);
  const dur = s === e ? 1440 : s < e ? e - s : 1440 - s + e;
  return Math.round((dur / 1440) * 100);
}

function dashboardKpis() {
  const total = state.workloads.length;
  const live = state.workloads.filter((w) => (w.desired || 0) > 0);
  const sch = state.schedule;
  const archives = state.archives.length;
  const schedulePct = sch?.enabled ? windowPercent(sch.start, sch.end) : 0;
  const tz = String(sch?.timezone || "").split("/").pop();
  return [
    {
      label: t(state.locale, "kpiLive"),
      count: live.length,
      hint: live.length
        ? live.map((w) => w.id).join(" · ")
        : t(state.locale, "kpiOfTotal", { total }),
      ring: total ? Math.round((live.length / total) * 100) : 0,
    },
    {
      label: t(state.locale, "kpiScheduleWindow"),
      text: sch ? t(state.locale, sch.enabled ? "kpiOn" : "kpiOff") : "—",
      hint: sch ? `${sch.start}–${sch.end} ${tz}` : t(state.locale, "kpiNoSchedule"),
      ring: schedulePct,
    },
    {
      label: t(state.locale, "kpiRestoreReady"),
      count: archives,
      hint: t(state.locale, "kpiNfsArchives"),
      ring: Math.min(100, Math.round((archives / 40) * 100)),
    },
  ];
}

function pageDashboard() {
  const animate = state.kpiAnimate && !reduceMotion;
  const kpis = dashboardKpis()
    .map((k) => {
      const ring = animate ? 0 : k.ring;
      const value =
        k.count !== undefined
          ? `<div class="val" data-count="${k.count}">${animate ? 0 : k.count}</div>`
          : `<div class="val">${escapeHtml(k.text)}</div>`;
      return `
      <article class="kpi">
        <div>
          <div class="lbl">${escapeHtml(k.label)}</div>
          ${value}
          <div class="hint">${escapeHtml(k.hint)}</div>
        </div>
        <div class="ring" role="img" aria-label="${k.ring}%" style="--p:${ring}%" data-p="${ring}%" data-ring="${k.ring}"></div>
      </article>`;
    })
    .join("");

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
      <div class="kpi-row">${kpis}</div>
      <article class="card" style="margin-top:1rem">
        <h2>${escapeHtml(t(state.locale, "workloads"))}</h2>
        <div class="workload-list">${rows || `<p class="hint">${escapeHtml(t(state.locale, "loading"))}</p>`}</div>
      </article>
    </section>`;
}

function setRing(ring, pct) {
  ring.style.setProperty("--p", `${pct}%`);
  ring.dataset.p = `${pct}%`;
}

function animateKpis(root) {
  const vals = [...root.querySelectorAll(".kpi .val[data-count]")];
  const rings = [...root.querySelectorAll(".ring[data-ring]")];
  const duration = 800;
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    vals.forEach((v) => {
      v.textContent = String(Math.round(Number(v.dataset.count) * eased));
    });
    rings.forEach((r) => setRing(r, Math.round(Number(r.dataset.ring) * eased)));
    const alive = (rings[0] || vals[0])?.isConnected;
    if (k < 1 && alive) {
      requestAnimationFrame(step);
    } else if (alive) {
      rings.forEach((r) => {
        r.classList.add("ring-pop");
        setTimeout(() => r.classList.remove("ring-pop"), 280);
      });
    }
  };
  requestAnimationFrame(step);
}

/* ───────────────────────── schedule ───────────────────────── */

function scheduleClockArgs() {
  const form = document.getElementById("schedule-form");
  if (form) {
    const fd = new FormData(form);
    return {
      start: String(fd.get("start") || "06:30"),
      end: String(fd.get("end") || "23:45"),
      enabled: fd.get("enabled") === "true",
      timezone: String(fd.get("timezone") || "Europe/Berlin"),
    };
  }
  return {
    start: state.schedule?.start,
    end: state.schedule?.end,
    enabled: !!state.schedule?.enabled,
    timezone: state.schedule?.timezone,
  };
}

function paintClock() {
  const root = document.getElementById("scheduleClockCard");
  if (!root) return;
  paintScheduleClock(root, scheduleClockArgs());
}

function pageSchedule() {
  const active = !!state.schedule?.active_now;
  const status = active ? t(state.locale, "scheduleLive") : t(state.locale, "scheduleIdle");
  const start = state.schedule?.start || "—";
  const end = state.schedule?.end || "—";
  return `
    <section aria-label="${escapeHtml(t(state.locale, "navSchedule"))}">
      <article class="card schedule-clock-card" id="scheduleClockCard" data-tooltip="${escapeHtml(t(state.locale, "scheduleClockTip"))}">
        <div class="schedule-clock-layout">
          ${scheduleClockShellHtml()}
          <div class="schedule-clock-meta">
            <p class="sr-only" id="scheduleSr" aria-live="polite">${escapeHtml(
              t(state.locale, "scheduleStatusSr", { status, start, end }),
            )}</p>
            <strong>${escapeHtml(t(state.locale, active ? "scheduleWindowActive" : "scheduleWindowPaused"))}</strong>
            <span class="meta-line">${escapeHtml(
              t(state.locale, "scheduleWindow", { start, end, tz: state.schedule?.timezone || "—" }),
            )}</span>
            <span class="clock-digital" id="scheduleClockDigital">--:--</span>
            <span class="badge ${active ? "live" : "idle"}" data-tooltip="${escapeHtml(t(state.locale, "scheduleLiveTip"))}">${escapeHtml(status)}</span>
            <span class="clock-hint">${escapeHtml(t(state.locale, "scheduleClockHint"))}</span>
          </div>
        </div>
      </article>
      <article class="card schedule-daynight-card">
        <div class="card-head"><h2>${escapeHtml(t(state.locale, "dayNight"))}</h2></div>
        <form id="schedule-form" class="form-grid schedule-form">
          <label class="field field-time">${escapeHtml(t(state.locale, "startTime"))}
            <input name="start" type="time" value="${escapeHtml(state.schedule?.start || "06:30")}" />
          </label>
          <label class="field field-time">${escapeHtml(t(state.locale, "endTime"))}
            <input name="end" type="time" value="${escapeHtml(state.schedule?.end || "23:45")}" />
          </label>
          <label class="field field-tz">${escapeHtml(t(state.locale, "timezone"))}
            <select name="timezone" data-tooltip="${escapeHtml(t(state.locale, "timezoneHint"))}">
              ${timezoneSelectHtml(state.schedule?.timezone || "Europe/Berlin", state.locale)}
            </select>
            <span class="field-hint">${escapeHtml(t(state.locale, "timezoneHint"))}</span>
          </label>
          <label class="field field-enabled">${escapeHtml(t(state.locale, "scheduleEnabled"))}
            <select name="enabled">
              <option value="true" ${state.schedule?.enabled ? "selected" : ""}>${escapeHtml(t(state.locale, "enabledOn"))}</option>
              <option value="false" ${!state.schedule?.enabled ? "selected" : ""}>${escapeHtml(t(state.locale, "enabledOff"))}</option>
            </select>
          </label>
          <div class="schedule-daynight-actions">
            <button class="btn primary" type="submit">${escapeHtml(t(state.locale, "save"))}</button>
          </div>
        </form>
      </article>
    </section>`;
}

/* ───────────────────────── restore ───────────────────────── */

function archiveSize(a) {
  return a?.size ? a.size / 1048576 : parseSizeMb(a?.size_h);
}

function formatArchiveSizeLabel(a) {
  const raw = String(a?.size_h || "").trim();
  if (raw) {
    const m = raw.match(/^([\d.]+)\s*(KB|MB|GB|B)\b/i);
    if (m) {
      const n = Number(m[1]);
      const u = m[2].toUpperCase();
      const label = Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9
        ? String(Math.round(n))
        : (Math.round(n * 10) / 10).toFixed(1);
      return `${label} ${u}`;
    }
    return raw;
  }
  const bytes = Number(a?.size || 0);
  if (!(bytes > 0)) return "n/a";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb >= 100 ? Math.round(kb) : (Math.round(kb * 10) / 10).toFixed(1)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb >= 100 ? Math.round(mb) : (Math.round(mb * 10) / 10).toFixed(1)} MB`;
}

function fmtArchiveTime(a) {
  const d = new Date(a.mtime);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(loc(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(loc(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ensureCalCursor() {
  if (state.calCursor) return state.calCursor;
  const base = state.archives[0] ? new Date(state.archives[0].mtime) : new Date();
  const d = Number.isNaN(base.getTime()) ? new Date() : base;
  state.calCursor = new Date(d.getFullYear(), d.getMonth(), 1);
  return state.calCursor;
}

function selectArchive(name) {
  state.selectedArchive = name;
  const a = name === "latest" ? null : state.archives.find((x) => x.name === name);
  state.selectedBackupDate = a ? archiveDateKey(a) : "";
  if (state.selectedBackupDate) {
    const [y, m] = state.selectedBackupDate.split("-").map(Number);
    state.calCursor = new Date(y, m - 1, 1);
  }
}

function selectedArchiveInfo() {
  if (state.selectedArchive === "latest") {
    return state.archives[0] ? { archive: state.archives[0], latest: true } : null;
  }
  const a = state.archives.find((x) => x.name === state.selectedArchive);
  return a ? { archive: a, latest: false } : null;
}

function restoreArchivesHtml() {
  const q = (state.archiveQuery || "").trim().toLowerCase();
  let list = state.dayFilter ? archivesForDate(state.archives, state.dayFilter) : state.archives;
  if (q) {
    list = list.filter((a) => {
      const hay = `${a.name} ${a.size_h || ""} ${fmtArchiveTime(a)}`.toLowerCase();
      return hay.includes(q);
    });
  }
  const showLatest = !state.dayFilter && (!q || "latest".includes(q) || t(state.locale, "restoreLatest").toLowerCase().includes(q));
  const latestRow = showLatest
    ? `<button type="button" class="archive-item ${state.selectedArchive === "latest" ? "selected" : ""}"
      data-archive="latest" aria-pressed="${state.selectedArchive === "latest"}">
      <span><strong>${escapeHtml(t(state.locale, "restoreLatest"))}</strong><br /><span class="hint">${escapeHtml(t(state.locale, "restoreLatestHint"))}</span></span>
      <span class="hint">auto</span>
    </button>`
    : "";
  const rows = list
    .map(
      (a) => `<button type="button" class="archive-item ${state.selectedArchive === a.name ? "selected" : ""}"
        data-archive="${escapeHtml(a.name)}" aria-pressed="${state.selectedArchive === a.name}">
        <span>${escapeHtml(a.name)}</span>
        <span class="meta"><span class="hint">${escapeHtml(formatArchiveSizeLabel(a))}</span><span class="hint">${escapeHtml(fmtArchiveTime(a))}</span></span>
      </button>`,
    )
    .join("");
  const empty = !state.archives.length
    ? `<p class="hint">${escapeHtml(t(state.locale, "restoreEmpty"))}</p>`
    : (!rows && !latestRow ? `<p class="hint">${escapeHtml(t(state.locale, "restoreFilterEmpty"))}</p>` : "");
  const dayBar = state.dayFilter
    ? `<div class="day-filter">
        <span class="hint">${escapeHtml(t(state.locale, "restoreFilterDay", { date: fmtDay(state.dayFilter) }))}</span>
        <button type="button" class="ghost-btn" data-clear-filter>${escapeHtml(t(state.locale, "restoreShowAll"))}</button>
      </div>`
    : "";
  const info = selectedArchiveInfo();
  const review = info
    ? `<div class="restore-review" id="restoreReview">
        <span class="rr-label">${escapeHtml(t(state.locale, "restoreReviewLabel"))}</span>
        <span class="rr-name">${escapeHtml(info.latest ? t(state.locale, "restoreLatest") : info.archive.name)}</span>
        <span class="rr-meta">${escapeHtml(info.latest ? t(state.locale, "restoreLatestHint") : `${formatArchiveSizeLabel(info.archive)} · ${fmtArchiveTime(info.archive)}`)}</span>
      </div>`
    : `<div class="restore-review is-empty" id="restoreReview">
        <span class="rr-label">${escapeHtml(t(state.locale, "restoreReviewLabel"))}</span>
        <span class="rr-name">${escapeHtml(t(state.locale, "restoreReviewNone"))}</span>
        <span class="rr-meta">${escapeHtml(t(state.locale, "restoreReviewNoneHint"))}</span>
      </div>`;
  return `${dayBar}<div class="archive-list">${latestRow}${rows}${empty}</div>${review}`;
}

function jobRow(j) {
  const selected = logJobName() === j.name;
  return `<button type="button" class="job-item ${selected ? "selected" : ""}" data-job="${escapeHtml(j.name)}"
    aria-pressed="${selected}" aria-label="${escapeHtml(t(state.locale, "restoreJobLogsBtn"))}: ${escapeHtml(j.name)}">
    <span class="job-name">${escapeHtml(j.name)}</span>
    <span class="hint">${escapeHtml(j.status)} · ${escapeHtml(j.archive)}</span>
  </button>`;
}

function restoreJobsHtml() {
  const active = (state.jobs.active || []).map(jobRow).join("");
  const recent = (state.jobs.recent || []).map(jobRow).join("");
  return `
    <div class="hint">${escapeHtml(t(state.locale, "restoreActive"))}</div>
    <div class="job-list">${
      active ||
      `<div class="job-item" style="cursor:default"><span>${escapeHtml(t(state.locale, "restoreNoActive"))}</span><span class="hint">${escapeHtml(t(state.locale, "restoreNoActiveHint"))}</span></div>`
    }</div>
    <div class="hint" style="margin-top:0.75rem">${escapeHtml(t(state.locale, "restoreRecent"))}</div>
    <div class="job-list">${recent || "—"}</div>`;
}

function logJobName() {
  return state.selectedJobName || state.jobs.active?.[0]?.name || "";
}

function restoreLogHtml() {
  const name = logJobName();
  const text = name ? state.selectedJobLogs : "";
  return `<div class="hint" style="margin-bottom:0.5rem">${escapeHtml(name || t(state.locale, "restoreJobLogsEmpty"))}</div>
    <div class="log-box" id="restoreLogBody" role="log" tabindex="0">${escapeHtml(text)}</div>`;
}

function backupDetailHtml() {
  const info = selectedArchiveInfo();
  if (!info) {
    return `
      <div class="backup-detail-head">
        <h3>${escapeHtml(t(state.locale, "bdNone"))}</h3>
        <p class="bd-sub">${escapeHtml(t(state.locale, "bdNoneSub"))}</p>
      </div>
      <div class="backup-ring" style="--p:0%"><span>—</span></div>
      <p class="bd-body">${escapeHtml(t(state.locale, "bdNoneBody"))}</p>
      <button type="button" class="backup-detail-btn" id="bdAction" disabled>${escapeHtml(t(state.locale, "bdApply"))}</button>`;
  }
  const { archive: a, latest } = info;
  const iso = archiveDateKey(a);
  const sizeMb = archiveSize(a);
  const max = Math.max(1, ...state.archives.map(archiveSize));
  const pct = sizeMb ? Math.max(8, Math.round((sizeMb / max) * 100)) : 0;
  const sizeLabel = formatArchiveSizeLabel(a);
  const dayCount = iso ? archivesForDate(state.archives, iso).length : 0;
  const dayNote = latest
    ? t(state.locale, "bdAlias")
    : t(state.locale, dayCount === 1 ? "bdDayCountOne" : "bdDayCountMany", { n: dayCount });
  const title = latest ? `${t(state.locale, "restoreLatest")} · ${fmtDay(iso)}` : fmtDay(iso);
  return `
    <div class="backup-detail-head">
      <h3>${escapeHtml(title)}</h3>
      <p class="bd-sub">${escapeHtml(a.name)}</p>
    </div>
    <div class="backup-ring" style="--p:${pct}%"><span>${escapeHtml(sizeLabel)}</span></div>
    <p class="bd-body">${escapeHtml(`${fmtArchiveTime(a)} · ${dayNote}`)}</p>
    <button type="button" class="backup-detail-btn" id="bdAction">${escapeHtml(t(state.locale, "bdApply"))}</button>`;
}

function pageRestore() {
  ensureCalCursor();
  const info = selectedArchiveInfo();
  return `
    <section aria-label="${escapeHtml(t(state.locale, "restoreTitle"))}" id="page-restore">
      <div class="restore-layout">
        <div class="restore-main">
          <article class="card">
            <div class="card-head">
              <h2>${escapeHtml(t(state.locale, "restoreArchives"))}</h2>
              <span class="badge idle">${escapeHtml(t(state.locale, "restoreNs"))}</span>
            </div>
            <div class="archive-toolbar">
              <label for="archiveFilter">${escapeHtml(t(state.locale, "restoreSearchLabel"))}</label>
              <input id="archiveFilter" type="search" placeholder="${escapeHtml(t(state.locale, "restoreSearchPh"))}" value="${escapeHtml(state.archiveQuery || "")}" autocomplete="off" />
            </div>
            <div id="archiveList">${restoreArchivesHtml()}</div>
            <form id="restore-form" class="form-grid danger-panel">
              <label class="check"><input type="checkbox" name="force" ${state.restoreForce ? "checked" : ""} /> ${escapeHtml(t(state.locale, "restoreForce"))}</label>
              <label>${escapeHtml(t(state.locale, "restoreConfirm"))}<input id="restoreConfirm" name="confirm" autocomplete="off" placeholder="RESTORE" value="${escapeHtml(state.restoreConfirm)}" /></label>
              <button class="btn danger" type="submit">${escapeHtml(t(state.locale, "restoreStart"))}</button>
            </form>
          </article>
          <article class="card">
            <div class="card-head"><h2>${escapeHtml(t(state.locale, "restoreJobs"))}</h2></div>
            <div id="jobPanel">${restoreJobsHtml()}</div>
          </article>
          <article class="card">
            <div class="card-head"><h2>${escapeHtml(t(state.locale, "restoreJobLogs"))}</h2></div>
            <div id="restoreLog">${restoreLogHtml()}</div>
          </article>
        </div>
        <aside class="restore-cal">
          <article class="card cal-card ${state.showWeekNumbers ? "show-weeks" : ""}" id="calCard" data-sel-theme="${state.selTheme}" aria-label="${escapeHtml(t(state.locale, "calendarTitle"))}">
            <div class="cal-head">
              <button type="button" class="cal-nav" id="calPrev" aria-label="${escapeHtml(t(state.locale, "calPrev"))}" data-tooltip="${escapeHtml(t(state.locale, "calPrev"))}">‹</button>
              <h2 id="calMonthLabel"></h2>
              <button type="button" class="cal-nav" id="calNext" aria-label="${escapeHtml(t(state.locale, "calNext"))}" data-tooltip="${escapeHtml(t(state.locale, "calNext"))}">›</button>
            </div>
            <div class="cal-weekdays" id="calWeekdays"></div>
            <div class="cal-grid" id="calGrid" aria-labelledby="calMonthLabel"></div>
            <div class="cal-legend">
              <span><i class="cal-dot" aria-hidden="true"></i> ${escapeHtml(t(state.locale, "calLegendBackup"))}</span>
              <span><i class="cal-dot sel" aria-hidden="true"></i> ${escapeHtml(t(state.locale, "calLegendSelected"))}</span>
            </div>
          </article>
          <article class="card backup-detail ${info ? "" : "is-empty"}" id="backupDetail" data-sel-theme="${state.selTheme}" aria-live="polite" aria-label="${escapeHtml(t(state.locale, "bdAria"))}">
            ${backupDetailHtml()}
          </article>
        </aside>
      </div>
    </section>`;
}

function paintCalendar({ anim = "", pulse = "" } = {}) {
  const card = document.getElementById("calCard");
  if (!card) return;
  const counts = new Map();
  for (const a of state.archives) {
    const k = archiveDateKey(a);
    if (k) counts.set(k, (counts.get(k) || 0) + 1);
  }
  const { weekdaysHtml, gridHtml, monthLabel } = buildCalendarMarkup({
    cursor: ensureCalCursor(),
    locale: state.locale,
    showWeekNumbers: state.showWeekNumbers,
    selectedDate: state.selectedBackupDate,
    backupDates: backupDateSet(state.archives),
    archiveCounts: counts,
    escapeHtml,
  });
  card.classList.toggle("show-weeks", state.showWeekNumbers);
  card.dataset.selTheme = state.selTheme;
  card.querySelector("#calMonthLabel").textContent = monthLabel;
  card.querySelector("#calWeekdays").innerHTML = weekdaysHtml;
  const grid = card.querySelector("#calGrid");
  grid.innerHTML = gridHtml;
  grid.classList.remove("cal-anim-prev", "cal-anim-next");
  if (anim && !reduceMotion) {
    void grid.offsetWidth;
    grid.classList.add(anim === "prev" ? "cal-anim-prev" : "cal-anim-next");
  }
  if (pulse) grid.querySelector(`.cal-day[data-date="${pulse}"]`)?.classList.add("just-selected");
  hideTooltip();
  bindTooltips(card);
}

function paintRestoreArchives() {
  const node = document.getElementById("archiveList");
  if (node) node.innerHTML = restoreArchivesHtml();
  const filter = document.getElementById("archiveFilter");
  if (filter && filter.value !== (state.archiveQuery || "")) filter.value = state.archiveQuery || "";
}

function paintBackupDetail() {
  const card = document.getElementById("backupDetail");
  if (!card) return;
  card.classList.toggle("is-empty", !selectedArchiveInfo());
  card.dataset.selTheme = state.selTheme;
  card.innerHTML = backupDetailHtml();
}

function paintRestoreJobs() {
  const node = document.getElementById("jobPanel");
  if (node) node.innerHTML = restoreJobsHtml();
}

function paintRestoreLog() {
  const wrap = document.getElementById("restoreLog");
  if (!wrap) return;
  const box = wrap.querySelector("#restoreLogBody");
  const name = logJobName();
  const text = name ? state.selectedJobLogs : "";
  if (box && wrap.firstElementChild?.textContent === (name || t(state.locale, "restoreJobLogsEmpty"))) {
    if (box.textContent !== text) {
      const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
      box.textContent = text;
      if (stick) box.scrollTop = box.scrollHeight;
    }
    return;
  }
  wrap.innerHTML = restoreLogHtml();
  const fresh = wrap.querySelector("#restoreLogBody");
  if (fresh) fresh.scrollTop = fresh.scrollHeight;
}

async function loadJobLogs(name) {
  state.selectedJobName = name;
  try {
    const detail = await api(`/api/v1/restore/jobs/${encodeURIComponent(name)}`);
    state.selectedJobLogs = detail?.logs || "";
  } catch (err) {
    if (err.status === 401) throw err;
    state.selectedJobLogs = String(err.message || err);
  }
}

function archiveSignature() {
  return state.archives.map((a) => `${a.name}:${a.size}:${a.mtime}`).join("|");
}

function bindRestore(root) {
  const page = root.querySelector("#page-restore");
  if (!page) return;
  paintCalendar();
  bindTooltips(page);

  const repaintSelection = (pulse = "") => {
    paintRestoreArchives();
    paintCalendar({ pulse });
    paintBackupDetail();
  };

  page.querySelector("#archiveFilter")?.addEventListener("input", (e) => {
    state.archiveQuery = e.target.value || "";
    paintRestoreArchives();
    paintBackupDetail();
  });
  page.querySelector("#archiveList")?.addEventListener("click", (e) => {
    if (e.target.closest("[data-clear-filter]")) {
      state.dayFilter = "";
      paintRestoreArchives();
      return;
    }
    const btn = e.target.closest("[data-archive]");
    if (!btn) return;
    selectArchive(btn.dataset.archive);
    repaintSelection(state.selectedBackupDate);
  });

  page.querySelector("#calPrev")?.addEventListener("click", () => {
    const c = ensureCalCursor();
    state.calCursor = new Date(c.getFullYear(), c.getMonth() - 1, 1);
    paintCalendar({ anim: "prev" });
  });
  page.querySelector("#calNext")?.addEventListener("click", () => {
    const c = ensureCalCursor();
    state.calCursor = new Date(c.getFullYear(), c.getMonth() + 1, 1);
    paintCalendar({ anim: "next" });
  });
  page.querySelector("#calGrid")?.addEventListener("click", (e) => {
    const day = e.target.closest(".cal-day.has-backup");
    if (!day) return;
    const iso = day.dataset.date;
    const first = archivesForDate(state.archives, iso)[0];
    if (!first) return;
    state.dayFilter = state.dayFilter === iso ? "" : iso;
    selectArchive(first.name);
    repaintSelection(iso);
  });
  page.querySelector("#backupDetail")?.addEventListener("click", (e) => {
    if (!e.target.closest("#bdAction")) return;
    page.querySelector("#restore-form")?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    page.querySelector("#restoreConfirm")?.focus();
  });
  page.querySelector("#jobPanel")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-job]");
    if (!btn) return;
    try {
      await loadJobLogs(btn.dataset.job);
    } catch {
      state.me = null;
      render();
      return;
    }
    paintRestoreJobs();
    paintRestoreLog();
  });

  const form = page.querySelector("#restore-form");
  form?.querySelector('input[name="force"]')?.addEventListener("change", (e) => {
    state.restoreForce = e.target.checked;
  });
  form?.querySelector("#restoreConfirm")?.addEventListener("input", (e) => {
    state.restoreConfirm = e.target.value;
  });
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    state.error = "";
    try {
      const out = await api("/api/v1/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({
          archive: state.selectedArchive || "latest",
          confirm: state.restoreConfirm,
          force: state.restoreForce,
        }),
      });
      state.restoreConfirm = "";
      state.restoreForce = false;
      await refreshRestore();
      if (out?.job) await loadJobLogs(out.job);
      render();
    } catch (err) {
      state.error = String(err.message || err);
      render();
    }
  });
}

async function pollRestore() {
  if (restorePolling || !state.me || activePageId() !== "restore" || document.hidden) return;
  restorePolling = true;
  try {
    const before = archiveSignature();
    await refreshRestore();
    if (activePageId() !== "restore") return;
    if (before !== archiveSignature()) {
      paintRestoreArchives();
      paintCalendar();
      paintBackupDetail();
    }
    paintRestoreJobs();
    paintRestoreLog();
  } catch (err) {
    if (err.status === 401) {
      state.me = null;
      render();
    }
  } finally {
    restorePolling = false;
  }
}

/* ───────────────────────── settings ───────────────────────── */

function avatarPreviewInner(edit) {
  const letter = escapeHtml((state.me?.username || "?").slice(0, 1).toUpperCase());
  if (isAvatarSrcOk(edit.src)) return avatarImgHtml(edit.src, edit.pos).replace("<img ", '<img id="settingsAvatarImg" ');
  return `<span id="settingsAvatarFallback">${letter}</span>`;
}

function pageSettings() {
  const edit = ensureAvatarEdit();
  const has = isAvatarSrcOk(edit.src);
  const once = state.haBasicOnce;
  const passShown = state.haPassVisible && once?.password;
  const tab = state.settingsTab || "profil";
  const showHa = !!perms().ha;
  const effectiveTab = tab === "ha" && !showHa ? "profil" : tab;
  if (effectiveTab !== tab) state.settingsTab = effectiveTab;
  const radio = (name, value, checked, label, extra = "") => `
    <label>
      <input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""} />
      ${extra}${escapeHtml(label)}
    </label>`;
  const tabBtn = (id, label, extra = "") => `
    <button type="button" role="tab" data-settings-tab="${id}" aria-selected="${effectiveTab === id ? "true" : "false"}" ${extra}>${escapeHtml(label)}</button>`;
  return `
    <section aria-label="${escapeHtml(t(state.locale, "settings"))}" id="page-settings">
      <div class="settings-tabs" role="tablist" aria-label="${escapeHtml(t(state.locale, "settingsTabsAria"))}">
        ${tabBtn("profil", t(state.locale, "settingsTabProfil"))}
        ${showHa ? tabBtn("ha", t(state.locale, "settingsTabHa")) : ""}
        ${tabBtn("anzeige", t(state.locale, "settingsTabAnzeige"))}
        ${tabBtn("session", t(state.locale, "settingsTabSession"))}
      </div>

      <div class="settings-panel" data-settings-panel="profil" ${effectiveTab === "profil" ? "" : "hidden"}>
        <article class="card">
          <div class="card-head"><h2>${escapeHtml(t(state.locale, "profileTitle"))}</h2></div>
          <div class="avatar-editor">
            <div class="avatar-preview-wrap">
              <div class="avatar avatar-lg ${has ? "draggable" : ""}" id="settingsAvatar" data-tooltip="${escapeHtml(t(state.locale, "avatarDragTip"))}">${avatarPreviewInner(edit)}</div>
              <span class="hint">${escapeHtml(t(state.locale, "avatarDragHint"))}</span>
            </div>
            <div class="avatar-form">
              <p class="hint" style="margin:0">${escapeHtml(t(state.locale, "avatarIntro"))}</p>
              <p class="avatar-help">
                <strong>${escapeHtml(t(state.locale, "avatarFormats"))}:</strong> JPEG, PNG, WebP, GIF<br />
                <strong>${escapeHtml(t(state.locale, "avatarMaxSize"))}:</strong> 2&nbsp;MB<br />
                <strong>${escapeHtml(t(state.locale, "avatarRecommended"))}:</strong> ${escapeHtml(t(state.locale, "avatarRecommendedValue"))}
              </p>
              <label>${escapeHtml(t(state.locale, "avatarUrlOverride"))}
                <input id="avatarUrl" type="url" value="${escapeHtml(edit.src.startsWith("data:") ? "" : edit.src)}" placeholder="https://…" />
              </label>
              <div class="avatar-pos" id="avatarPosControls" ${has ? "" : "hidden"}>
                <label>${escapeHtml(t(state.locale, "avatarHoriz"))} <span id="avatarPosXVal">${edit.pos.x}%</span>
                  <input id="avatarPosX" type="range" min="0" max="100" value="${edit.pos.x}" /></label>
                <label>${escapeHtml(t(state.locale, "avatarVert"))} <span id="avatarPosYVal">${edit.pos.y}%</span>
                  <input id="avatarPosY" type="range" min="0" max="100" value="${edit.pos.y}" /></label>
                <button class="btn" type="button" id="avatarPosReset">${escapeHtml(t(state.locale, "avatarCenter"))}</button>
              </div>
              <p class="avatar-error" id="avatarError" role="alert">${escapeHtml(edit.error || "")}</p>
              <div class="btn-row">
                <button class="btn primary" type="button" id="avatarApply">${escapeHtml(t(state.locale, "avatarApply"))}</button>
                <button class="btn" type="button" id="avatarClear">${escapeHtml(t(state.locale, "avatarClear"))}</button>
                <label class="btn file-btn">${escapeHtml(t(state.locale, "avatarFile"))}
                  <input id="avatarFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" hidden />
                </label>
              </div>
            </div>
          </div>
        </article>
        <article class="card">
          <div class="card-head"><h2>${escapeHtml(t(state.locale, "permTitle"))}</h2></div>
          <p class="perm-note">
            ${escapeHtml(t(state.locale, "permIntro"))}<br />
            ${escapeHtml(t(state.locale, "permDash"))}<br />
            ${escapeHtml(t(state.locale, "permRestore"))}<br />
            ${escapeHtml(t(state.locale, "permDocs"))}<br />
            ${escapeHtml(t(state.locale, "permSettings"))}
          </p>
        </article>
      </div>

      ${
        showHa
          ? `<div class="settings-panel" data-settings-panel="ha" ${effectiveTab === "ha" ? "" : "hidden"}>
              <article class="card">
                <div class="card-head"><h2>${escapeHtml(t(state.locale, "haApiCardTitle"))}</h2></div>
                <p class="hint">${escapeHtml(t(state.locale, "haApiHelp"))}</p>
                <button class="btn primary" type="button" id="ha-rotate">${escapeHtml(t(state.locale, "haApiRotate"))}</button>
                ${
                  once
                    ? `<div class="form-grid" style="margin-top:0.75rem" aria-live="polite">
                        <p class="hint">${escapeHtml(t(state.locale, "haApiOnceHint"))}</p>
                        <label>${escapeHtml(t(state.locale, "username"))}
                          <span class="ha-once-row">
                            <input readonly id="ha-user" value="${escapeHtml(once.username)}" />
                            <button type="button" class="btn" id="ha-copy-user">${escapeHtml(t(state.locale, "haApiCopyUser"))}</button>
                          </span>
                        </label>
                        <label>${escapeHtml(t(state.locale, "password"))}
                          <span class="ha-once-row">
                            <input readonly id="ha-pass" type="${passShown ? "text" : "password"}" value="${escapeHtml(once.password)}" class="mono" />
                            <button type="button" class="btn" id="ha-toggle">${escapeHtml(t(state.locale, passShown ? "haApiHidePass" : "haApiShowPass"))}</button>
                            <button type="button" class="btn" id="ha-copy-pass">${escapeHtml(t(state.locale, "haApiCopyPass"))}</button>
                          </span>
                        </label>
                      </div>`
                    : ""
                }
              </article>
            </div>`
          : ""
      }

      <div class="settings-panel" data-settings-panel="anzeige" ${effectiveTab === "anzeige" ? "" : "hidden"}>
        <article class="card">
          <div class="card-head"><h2>${escapeHtml(t(state.locale, "displayTitle"))}</h2></div>
          <div class="form-grid">
            <label class="check"><input type="checkbox" id="showClock" ${state.showClock ? "checked" : ""} /> ${escapeHtml(t(state.locale, "showClock"))}</label>
            <label class="check"><input type="checkbox" id="showWeekNumbers" ${state.showWeekNumbers ? "checked" : ""} /> ${escapeHtml(t(state.locale, "showWeekNumbers"))}</label>
            ${
              perms().docs
                ? `<label class="check"><input type="checkbox" id="showDocs" ${state.showDocs ? "checked" : ""} /> ${escapeHtml(t(state.locale, "showDocs"))}</label>
            <p class="settings-note" style="grid-column:1/-1;margin:0">${escapeHtml(t(state.locale, "showDocsHelp"))}</p>`
                : ""
            }
          </div>
          <p class="settings-sub">${escapeHtml(t(state.locale, "selThemeTitle"))}</p>
          <div class="sel-theme-picker" role="radiogroup" aria-label="${escapeHtml(t(state.locale, "selThemeTitle"))}">
            ${radio("selTheme", "a", state.selTheme === "a", t(state.locale, "selThemeTeal"), '<i class="sel-swatch a" aria-hidden="true"></i>')}
            ${radio("selTheme", "b", state.selTheme === "b", t(state.locale, "selThemeBlue"), '<i class="sel-swatch b" aria-hidden="true"></i>')}
          </div>
          <p class="settings-note">${escapeHtml(t(state.locale, "selThemeHelp"))}</p>
          <p class="settings-sub">${escapeHtml(t(state.locale, "logoAnimTitle"))}</p>
          <div class="sel-theme-picker" role="radiogroup" aria-label="${escapeHtml(t(state.locale, "logoAnimTitle"))}">
            ${radio("logoAnim", "setsail", state.logoAnim === "setsail", t(state.locale, "logoSetsail"))}
            ${radio("logoAnim", "float", state.logoAnim === "float", t(state.locale, "logoFloat"))}
            ${radio("logoAnim", "parallax", state.logoAnim === "parallax", t(state.locale, "logoParallax"))}
          </div>
          <p class="settings-note">${escapeHtml(t(state.locale, "logoAnimHelp"))}</p>
        </article>
      </div>

      <div class="settings-panel" data-settings-panel="session" ${effectiveTab === "session" ? "" : "hidden"}>
        <article class="card">
          <div class="card-head"><h2>${escapeHtml(t(state.locale, "sessionTitle"))}</h2></div>
          <p class="hint" style="margin:0">${escapeHtml(t(state.locale, "authHint"))}: ${escapeHtml(state.me?.configured_auth_mode || "—")} · ${escapeHtml(t(state.locale, "version"))}: ${escapeHtml(state.me?.version || "—")}</p>
        </article>
      </div>
    </section>`;
}

async function copyText(text, btn) {
  const label = btn.textContent;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (!ok) throw new Error("copy");
    }
    btn.textContent = t(state.locale, "haApiCopied");
  } catch {
    btn.textContent = t(state.locale, "haCopyFailed");
  }
  setTimeout(() => {
    if (btn.isConnected) btn.textContent = label;
  }, 1500);
}

function bindSettings(root) {
  const page = root.querySelector("#page-settings");
  page?.querySelector(".settings-tabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-settings-tab]");
    if (!btn) return;
    const next = btn.dataset.settingsTab;
    if (!next || next === state.settingsTab) return;
    state.settingsTab = next;
    state.pendingFocus = `[data-settings-tab="${next}"]`;
    render();
  });
  if (page && !reduceMotion) {
    page.classList.remove("settings-enter");
    void page.offsetWidth;
    page.classList.add("settings-enter");
  }

  const edit = ensureAvatarEdit();
  const avatar = root.querySelector("#settingsAvatar");
  const errorEl = root.querySelector("#avatarError");
  if (!avatar) {
    /* continue with display/HA bindings */
  } else {
  const controls = root.querySelector("#avatarPosControls");
  const posX = root.querySelector("#avatarPosX");
  const posY = root.querySelector("#avatarPosY");
  const urlInput = root.querySelector("#avatarUrl");

  const setError = (msg) => {
    edit.error = msg;
    if (errorEl) errorEl.textContent = msg;
  };

  const paintPos = () => {
    const img = avatar.querySelector("img");
    applyAvatarFrame(img, edit.pos);
    posX.value = String(edit.pos.x);
    posY.value = String(edit.pos.y);
    root.querySelector("#avatarPosXVal").textContent = `${edit.pos.x}%`;
    root.querySelector("#avatarPosYVal").textContent = `${edit.pos.y}%`;
  };

  const paintPreview = () => {
    const has = isAvatarSrcOk(edit.src);
    avatar.innerHTML = avatarPreviewInner(edit);
    avatar.classList.toggle("draggable", has);
    controls.hidden = !has;
    urlInput.value = edit.src.startsWith("data:") ? "" : edit.src;
    paintPos();
  };

  const persist = () => {
    const prev = { url: state.avatarUrl, pos: state.avatarPos };
    try {
      if (edit.src) localStorage.setItem(PREF.avatar, edit.src);
      else localStorage.removeItem(PREF.avatar);
      localStorage.setItem(PREF.avatarPos, JSON.stringify(edit.pos));
    } catch {
      try {
        if (prev.url) localStorage.setItem(PREF.avatar, prev.url);
        else localStorage.removeItem(PREF.avatar);
      } catch {
        /* ignore */
      }
      setError(t(state.locale, "avatarErrStore"));
      return false;
    }
    state.avatarUrl = edit.src;
    state.avatarPos = { ...edit.pos };
    return true;
  };

  urlInput.addEventListener("change", () => {
    const v = urlInput.value.trim();
    if (!v) return;
    if (!isAvatarSrcOk(v)) {
      setError(t(state.locale, "avatarErrUrl"));
      return;
    }
    setError("");
    edit.src = v;
    paintPreview();
  });

  root.querySelector("#avatarFile").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!AVATAR_TYPES.has(file.type)) {
      setError(t(state.locale, "avatarErrType"));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError(t(state.locale, "avatarErrSize", { mb: (file.size / 1024 / 1024).toFixed(1) }));
      return;
    }
    try {
      edit.src = await readAvatarFile(file);
      edit.pos = { x: 50, y: 50 };
      setError("");
      paintPreview();
    } catch {
      setError(t(state.locale, "avatarErrRead"));
    }
  });

  posX.addEventListener("input", () => {
    edit.pos.x = clampPct(Number(posX.value));
    paintPos();
  });
  posY.addEventListener("input", () => {
    edit.pos.y = clampPct(Number(posY.value));
    paintPos();
  });
  root.querySelector("#avatarPosReset").addEventListener("click", () => {
    edit.pos = { x: 50, y: 50 };
    paintPos();
  });

  let drag = null;
  avatar.addEventListener("pointerdown", (e) => {
    if (!avatar.classList.contains("draggable") || (e.button != null && e.button !== 0)) return;
    drag = { x0: e.clientX, y0: e.clientY, px: edit.pos.x, py: edit.pos.y };
    avatar.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  avatar.addEventListener("pointermove", (e) => {
    if (!drag) return;
    edit.pos.x = clampPct(drag.px - (e.clientX - drag.x0) * 0.35);
    edit.pos.y = clampPct(drag.py - (e.clientY - drag.y0) * 0.35);
    paintPos();
  });
  const endDrag = () => {
    drag = null;
  };
  avatar.addEventListener("pointerup", endDrag);
  avatar.addEventListener("pointercancel", endDrag);

  root.querySelector("#avatarApply").addEventListener("click", () => {
    const typed = urlInput.value.trim();
    if (typed && typed !== edit.src) {
      if (!isAvatarSrcOk(typed)) {
        setError(t(state.locale, "avatarErrUrl"));
        return;
      }
      edit.src = typed;
    }
    setError("");
    if (!persist()) return;
    state.toast = t(state.locale, "avatarSaved");
    render();
  });
  root.querySelector("#avatarClear").addEventListener("click", () => {
    edit.src = "";
    edit.pos = { x: 50, y: 50 };
    setError("");
    if (!persist()) return;
    state.avatarEdit = null;
    render();
  });

  } /* end avatar bindings */

  /* Display prefs apply immediately */
  root.querySelector("#showClock")?.addEventListener("change", (e) => {
    state.showClock = e.target.checked;
    localStorage.setItem(PREF.clock, state.showClock ? "1" : "0");
    state.pendingFocus = "#showClock";
    render();
  });
  root.querySelector("#showWeekNumbers")?.addEventListener("change", (e) => {
    state.showWeekNumbers = e.target.checked;
    localStorage.setItem(PREF.weeks, state.showWeekNumbers ? "1" : "0");
    state.pendingFocus = "#showWeekNumbers";
    render();
  });
  root.querySelector("#showDocs")?.addEventListener("change", (e) => {
    state.showDocs = e.target.checked;
    localStorage.setItem(PREF.docs, state.showDocs ? "1" : "0");
    state.pendingFocus = "#showDocs";
    if (!state.showDocs && activePageId() === "docs") {
      navigate(firstAllowedRoute());
      return;
    }
    render();
  });
  root.querySelectorAll('input[name="selTheme"]').forEach((inp) => {
    inp.addEventListener("change", () => {
      if (!inp.checked) return;
      state.selTheme = inp.value === "b" ? "b" : "a";
      localStorage.setItem(PREF.selTheme, state.selTheme);
      applyChrome();
      state.pendingFocus = `input[name="selTheme"][value="${state.selTheme}"]`;
      render();
    });
  });
  root.querySelectorAll('input[name="logoAnim"]').forEach((inp) => {
    inp.addEventListener("change", () => {
      if (!inp.checked || !LOGO_MODES.includes(inp.value)) return;
      state.logoAnim = inp.value;
      localStorage.setItem(PREF.logoAnim, state.logoAnim);
      state.logoPlay = state.logoAnim === "setsail";
      state.pendingFocus = `input[name="logoAnim"][value="${state.logoAnim}"]`;
      render();
    });
  });

  /* Home Assistant */
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
    state.pendingFocus = "#ha-toggle";
    render();
  });
  root.querySelector("#ha-copy-user")?.addEventListener("click", (e) => {
    copyText(state.haBasicOnce?.username || "", e.currentTarget);
  });
  root.querySelector("#ha-copy-pass")?.addEventListener("click", (e) => {
    copyText(state.haBasicOnce?.password || "", e.currentTarget);
  });
}

/* ───────────────────────── logs ───────────────────────── */

function pageLogs() {
  const levels = ["ALL", "INFO", "WARN", "DEBUG", "ERROR"];
  const chips = levels
    .map((lvl) => {
      const label = lvl === "ALL" ? t(state.locale, "logFilterAll") : lvl;
      const pressed = state.logLevelFilter === lvl ? "true" : "false";
      return `<button type="button" data-level="${lvl}" aria-pressed="${pressed}">${escapeHtml(label)}</button>`;
    })
    .join("");
  return `
    <section aria-label="${escapeHtml(t(state.locale, "logs"))}" id="page-logs">
      <article class="card">
        <div class="top-actions" style="justify-content:space-between;margin-bottom:0.75rem">
          <h2 style="margin:0">${escapeHtml(t(state.locale, "logs"))}</h2>
          <div class="top-actions">
            <button type="button" class="ghost-btn" id="log-pause">${escapeHtml(t(state.locale, state.logPaused ? "resume" : "pause"))}</button>
            <button type="button" class="ghost-btn" id="log-clear">${escapeHtml(t(state.locale, "clear"))}</button>
          </div>
        </div>
        <div class="log-toolbar">
          <div class="log-toolbar-row">
            <label class="sr-only" for="logSearch">${escapeHtml(t(state.locale, "logSearchLabel"))}</label>
            <input id="logSearch" class="log-search" type="search" placeholder="${escapeHtml(t(state.locale, "logSearchPh"))}" value="${escapeHtml(state.logQuery || "")}" autocomplete="off" />
            <div class="log-level-filters" role="group" aria-label="${escapeHtml(t(state.locale, "logFilterAria"))}">${chips}</div>
          </div>
          <div class="log-meta" aria-live="polite">
            <span id="logCountLabel"></span>
            <span id="logStreamLabel">${escapeHtml(t(state.locale, state.logPaused ? "logPaused" : "logLive"))}</span>
          </div>
        </div>
        <div class="log-box ${state.logPaused ? "is-paused" : ""}" id="log-body" role="log" tabindex="0"></div>
        <div class="log-empty" id="logEmpty" role="status">${escapeHtml(t(state.locale, "logEmptyFilter"))}</div>
      </article>
    </section>`;
}

/* ───────────────────────── docs (in-app help) ───────────────────────── */

function docsList(keys) {
  return `<ul class="docs-list">${keys.map((k) => `<li>${t(state.locale, k)}</li>`).join("")}</ul>`;
}

function pageDocs() {
  return `
    <section class="page" id="page-docs" aria-label="${escapeHtml(t(state.locale, "navDocs"))}">
      <p class="page-note">${escapeHtml(t(state.locale, "docsNote"))}</p>
      <nav class="docs-toc" aria-label="${escapeHtml(t(state.locale, "docsTocAria"))}">
        <a href="#docs-dashboard">${escapeHtml(t(state.locale, "docsTocDashboard"))}</a>
        <a href="#docs-restore">${escapeHtml(t(state.locale, "docsTocRestore"))}</a>
        <a href="#docs-podinfo">${escapeHtml(t(state.locale, "docsTocPodinfo"))}</a>
      </nav>
      <article class="card docs-card" id="docs-dashboard">
        <div class="card-head"><h2>${escapeHtml(t(state.locale, "docsDashTitle"))}</h2></div>
        <p class="docs-lead">${escapeHtml(t(state.locale, "docsDashLead"))}</p>
        <h3 class="docs-sub">${escapeHtml(t(state.locale, "docsDashSee"))}</h3>
        ${docsList(["docsDashSee1", "docsDashSee2", "docsDashSee3"])}
        <h3 class="docs-sub">${escapeHtml(t(state.locale, "docsDashActions"))}</h3>
        ${docsList(["docsDashAct1", "docsDashAct2", "docsDashAct3"])}
        <h3 class="docs-sub">${escapeHtml(t(state.locale, "docsPerm"))}</h3>
        ${docsList(["docsDashPerm1"])}
        <p class="docs-callout">${t(state.locale, "docsDashTip")}</p>
      </article>
      <article class="card docs-card" id="docs-restore">
        <div class="card-head"><h2>${escapeHtml(t(state.locale, "docsRestoreTitle"))}</h2></div>
        <p class="docs-lead">${escapeHtml(t(state.locale, "docsRestoreLead"))}</p>
        <h3 class="docs-sub">${escapeHtml(t(state.locale, "docsRestorePick"))}</h3>
        ${docsList(["docsRestorePick1", "docsRestorePick2", "docsRestorePick3", "docsRestorePick4"])}
        <h3 class="docs-sub">${escapeHtml(t(state.locale, "docsRestoreRun"))}</h3>
        ${docsList(["docsRestoreRun1", "docsRestoreRun2", "docsRestoreRun3", "docsRestoreRun4"])}
        <h3 class="docs-sub">${t(state.locale, "docsRestoreTarget")}</h3>
        ${docsList(["docsRestoreTarget1", "docsRestoreTarget2"])}
        <p class="docs-callout warn">${t(state.locale, "docsRestoreWarn")}</p>
      </article>
      <article class="card docs-card" id="docs-podinfo">
        <div class="card-head"><h2>${escapeHtml(t(state.locale, "docsPodinfoTitle"))}</h2></div>
        <p class="docs-lead">${escapeHtml(t(state.locale, "docsPodinfoLead"))}</p>
        <h3 class="docs-sub">${t(state.locale, "docsPodinfoRuntime")}</h3>
        ${docsList(["docsPodinfoRuntime1", "docsPodinfoRuntime2", "docsPodinfoRuntime3"])}
        <h3 class="docs-sub">${escapeHtml(t(state.locale, "docsPodinfoReady"))}</h3>
        ${docsList(["docsPodinfoReady1", "docsPodinfoReady2", "docsPodinfoReady3"])}
        <h3 class="docs-sub">${t(state.locale, "docsPodinfoChaos")}</h3>
        ${docsList(["docsPodinfoChaos1", "docsPodinfoChaos2", "docsPodinfoChaos3"])}
        <h3 class="docs-sub">${escapeHtml(t(state.locale, "docsPerm"))}</h3>
        ${docsList(["docsPodinfoPerm1"])}
        <p class="docs-callout">${t(state.locale, "docsPodinfoTip")}</p>
      </article>
    </section>`;
}

/* ───────────────────────── podinfo (lab) ───────────────────────── */

async function refreshLab({ metrics = false } = {}) {
  state.lab = await api("/api/v1/lab/status");
  if (metrics) {
    try {
      const res = await fetch("/metrics", { headers: headers(false) });
      const text = await res.text();
      state.labMetricsSample = text.split("\n").slice(0, 40).join("\n");
    } catch {
      state.labMetricsSample = "";
    }
  }
}

function parseMetricsCards(sample) {
  const lines = String(sample || "").split("\n");
  const help = {};
  const types = {};
  const series = [];
  for (const line of lines) {
    if (line.startsWith("# HELP ")) {
      const rest = line.slice(7);
      const sp = rest.indexOf(" ");
      if (sp > 0) help[rest.slice(0, sp)] = rest.slice(sp + 1);
    } else if (line.startsWith("# TYPE ")) {
      const parts = line.slice(7).trim().split(/\s+/);
      if (parts.length >= 2) types[parts[0]] = parts[1];
    } else if (line && !line.startsWith("#")) {
      const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+(\S+)/);
      if (!m) continue;
      const labels = [];
      if (m[2]) {
        for (const part of m[2].slice(1, -1).split(",")) {
          const kv = part.split("=");
          if (kv.length >= 2) labels.push([kv[0].trim(), kv.slice(1).join("=").replace(/^"|"$/g, "")]);
        }
      }
      series.push({
        name: m[1],
        labels,
        raw: m[3],
        value: Number(m[3]),
        type: types[m[1]] || "untyped",
        help: help[m[1]] || "",
      });
    }
  }
  const nums = series.map((s) => (Number.isFinite(s.value) ? Math.abs(s.value) : 0));
  const max = Math.max(1, ...nums);
  return series.slice(0, 4).map((s) => {
    let display = s.raw;
    let unit = "";
    if (s.name.includes("bytes") && Number.isFinite(s.value)) {
      display = (s.value / (1024 * 1024)).toFixed(1);
      unit = "MiB";
    } else if (Number.isFinite(s.value)) {
      display = Number.isInteger(s.value) ? String(s.value) : String(Math.round(s.value * 100) / 100);
    }
    const bar = Math.max(6, Math.round(((Number.isFinite(s.value) ? Math.abs(s.value) : 0) / max) * 100));
    return { ...s, display, unit, bar };
  });
}

function pagePodinfo() {
  const lab = state.lab || {};
  const ready = lab.ready !== false;
  const fault = !!lab.fault_injection;
  const version = lab.version || state.me?.version || "—";
  const commit = lab.commit || "—";
  const build = lab.build_date || "—";
  const cards = parseMetricsCards(state.labMetricsSample);
  const metricsCards = cards.length
    ? cards
        .map((c) => {
          const labels = c.labels
            .map(([k, v]) => `<span class="metric-label">${escapeHtml(k)}=<strong>${escapeHtml(v)}</strong></span>`)
            .join("");
          const typ = (c.type || "untyped").toLowerCase();
          return `<article class="metric-card ${typ === "gauge" ? "gauge" : ""}" style="--bar:${c.bar}%">
            <div class="metric-card-top">
              <div class="metric-name">${escapeHtml(c.name)}</div>
              <span class="metric-type ${escapeHtml(typ)}">${escapeHtml(typ)}</span>
            </div>
            ${c.help ? `<p class="metric-help">${escapeHtml(c.help)}</p>` : ""}
            <div class="metric-value-row">
              <span class="metric-value">${escapeHtml(c.display)}</span>
              <span class="metric-unit">${escapeHtml(c.unit || "")}</span>
            </div>
            ${labels ? `<div class="metric-labels">${labels}</div>` : ""}
            <div class="metric-bar" aria-hidden="true"><span></span></div>
          </article>`;
        })
        .join("")
    : `<p class="hint">${escapeHtml(t(state.locale, state.labMetricsLoaded ? "podinfoMetricsEmpty" : "loading"))}</p>`;
  return `
    <section aria-label="${escapeHtml(t(state.locale, "navPodinfo"))}" id="page-podinfo">
      <p class="hint" style="margin:0">${escapeHtml(t(state.locale, "podinfoIntro"))}</p>
      <div class="podinfo-layout">
        <div class="podinfo-hero" aria-label="${escapeHtml(t(state.locale, "podinfoStatusAria"))}">
          <div class="podinfo-tile ok">
            <span class="tile-label">${escapeHtml(t(state.locale, "podinfoHealth"))}</span>
            <span class="tile-value"><i class="pulse-dot" aria-hidden="true"></i><span>${escapeHtml(lab.health || "ok")}</span></span>
            <span class="tile-hint">Liveness <code>/healthz</code></span>
          </div>
          <div class="podinfo-tile ${ready ? "ok" : "warn"}">
            <span class="tile-label">${escapeHtml(t(state.locale, "podinfoReady"))}</span>
            <span class="tile-value"><i class="pulse-dot" aria-hidden="true"></i><span>${escapeHtml(ready ? t(state.locale, "podinfoReady") : t(state.locale, "podinfoNotReady"))}</span></span>
            <span class="tile-hint">${escapeHtml(t(state.locale, ready ? "podinfoReadyOn" : "podinfoReadyOff"))}</span>
          </div>
          <div class="podinfo-tile ${fault ? "bad" : "idle"}">
            <span class="tile-label">${escapeHtml(t(state.locale, "podinfoFault"))}</span>
            <span class="tile-value"><i class="pulse-dot" aria-hidden="true"></i><span>${escapeHtml(fault ? t(state.locale, "podinfoFaultOnShort") : t(state.locale, "podinfoFaultOffShort"))}</span></span>
            <span class="tile-hint">${escapeHtml(t(state.locale, fault ? "podinfoFaultOn" : "podinfoFaultOff"))}</span>
          </div>
        </div>
        <article class="card podinfo-runtime">
          <div class="card-head"><h2>${escapeHtml(t(state.locale, "podinfoRuntime"))}</h2></div>
          <div class="card-body">
            <div class="podinfo-section">
              <p class="podinfo-section-label">${escapeHtml(t(state.locale, "podinfoIdentity"))}</p>
              <div class="runtime-grid">
                <button type="button" class="podinfo-stat" data-copy-value="${escapeHtml(version)}" title="${escapeHtml(t(state.locale, "copy"))}">
                  <span class="ps-label">${escapeHtml(t(state.locale, "version"))}</span>
                  <span class="ps-value">${escapeHtml(version)}</span>
                </button>
                <button type="button" class="podinfo-stat" data-copy-value="${escapeHtml(commit)}" title="${escapeHtml(t(state.locale, "copy"))}">
                  <span class="ps-label">${escapeHtml(t(state.locale, "podinfoCommit"))}</span>
                  <span class="ps-value">${escapeHtml(commit)}</span>
                </button>
                <button type="button" class="podinfo-stat build" data-copy-value="${escapeHtml(build)}" title="${escapeHtml(t(state.locale, "copy"))}">
                  <span class="ps-label">${escapeHtml(t(state.locale, "podinfoBuild"))}</span>
                  <span class="ps-value">${escapeHtml(build)}</span>
                </button>
              </div>
            </div>
            <div class="podinfo-section">
              <p class="podinfo-section-label">${escapeHtml(t(state.locale, "podinfoEndpoints"))}</p>
              <div class="endpoint-row" role="group" aria-label="${escapeHtml(t(state.locale, "podinfoEndpoints"))}">
                <button type="button" class="endpoint-chip" data-endpoint="/healthz">/healthz</button>
                <button type="button" class="endpoint-chip" data-endpoint="/readyz">/readyz</button>
                <button type="button" class="endpoint-chip" data-endpoint="/metrics">/metrics</button>
                <button type="button" class="endpoint-chip" data-endpoint="/version">/version</button>
              </div>
              <p class="copy-toast" id="endpointToast" aria-live="polite"></p>
            </div>
          </div>
        </article>
        <article class="card podinfo-controls">
          <div class="card-head"><h2>${escapeHtml(t(state.locale, "podinfoControls"))}</h2></div>
          <div class="card-body">
            <div class="podinfo-section">
              <p class="podinfo-section-label">${escapeHtml(t(state.locale, "podinfoTrafficFault"))}</p>
              <button type="button" class="schedule-toggle" id="lab-ready-toggle"
                aria-pressed="${ready ? "true" : "false"}"
                aria-label="${escapeHtml(t(state.locale, "podinfoReadiness"))}">
                <span class="toggle-copy">
                  <strong>${escapeHtml(t(state.locale, "podinfoReady"))}</strong>
                  <span>${escapeHtml(t(state.locale, ready ? "podinfoReadyOn" : "podinfoReadyOff"))}</span>
                </span>
                <span class="toggle-switch" aria-hidden="true"></span>
              </button>
              <button type="button" class="schedule-toggle" id="lab-fault-toggle"
                aria-pressed="${fault ? "true" : "false"}"
                aria-label="${escapeHtml(t(state.locale, "podinfoFault"))}">
                <span class="toggle-copy">
                  <strong>${escapeHtml(t(state.locale, "podinfoFault"))}</strong>
                  <span>${escapeHtml(t(state.locale, fault ? "podinfoFaultOn" : "podinfoFaultOff"))}</span>
                </span>
                <span class="toggle-switch" aria-hidden="true"></span>
              </button>
            </div>
            <div class="podinfo-section">
              <p class="podinfo-section-label">${escapeHtml(t(state.locale, "podinfoProbeTools"))}</p>
              <div class="podinfo-chaos-grid">
                <label class="field">${escapeHtml(t(state.locale, "podinfoDelay"))}
                  <input id="lab-delay-sec" type="number" min="0" max="30" step="0.5" value="2" />
                </label>
                <label class="field">${escapeHtml(t(state.locale, "podinfoStatusCode"))}
                  <input id="lab-status-code" type="number" min="100" max="599" value="418" />
                </label>
                <div style="display:flex;gap:0.45rem;flex-wrap:wrap">
                  <button type="button" class="btn" id="lab-delay-btn">${escapeHtml(t(state.locale, "podinfoDelayTest"))}</button>
                  <button type="button" class="btn" id="lab-status-btn">${escapeHtml(t(state.locale, "podinfoStatusTest"))}</button>
                </div>
              </div>
              <p class="hint" id="lab-chaos-out" style="margin:0.65rem 0 0" aria-live="polite">${escapeHtml(state.labChaosOut || "")}</p>
            </div>
          </div>
        </article>
        <details class="metrics-panel" id="metricsPanel" ${state.labMetricsOpen ? "open" : ""}>
          <summary>
            <span>${escapeHtml(t(state.locale, "podinfoMetrics"))}</span>
            <span class="mp-meta">GET /metrics · ${cards.length || 0}</span>
            <svg class="mp-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </summary>
          <div class="metrics-body">
            <div class="metrics-cards" aria-label="${escapeHtml(t(state.locale, "podinfoMetrics"))}">${metricsCards}</div>
            <details class="metrics-raw">
              <summary>
                <span>${escapeHtml(t(state.locale, "podinfoMetricsRaw"))}</span>
                <a class="ghost-btn" href="/metrics" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escapeHtml(t(state.locale, "podinfoMetricsOpen"))}</a>
              </summary>
              <pre class="log-box podinfo-metrics-sample" aria-label="${escapeHtml(t(state.locale, "podinfoMetrics"))}">${escapeHtml(state.labMetricsSample || t(state.locale, "loading"))}</pre>
            </details>
          </div>
        </details>
      </div>
    </section>`;
}

function bindPodinfo(root) {
  root.querySelector("#lab-ready-toggle")?.addEventListener("click", async () => {
    const enable = root.querySelector("#lab-ready-toggle")?.getAttribute("aria-pressed") !== "true";
    try {
      await api(`/api/v1/lab/readyz/${enable ? "enable" : "disable"}`, { method: "POST" });
      if (state.lab) state.lab.ready = enable;
      else state.lab = { ready: enable };
      state.error = "";
      render();
    } catch (err) {
      state.error = String(err.message || err);
      render();
    }
  });
  root.querySelector("#lab-fault-toggle")?.addEventListener("click", async () => {
    const enable = root.querySelector("#lab-fault-toggle")?.getAttribute("aria-pressed") !== "true";
    try {
      await api(`/api/v1/lab/fault_injection/${enable ? "enable" : "disable"}`, { method: "POST" });
      if (state.lab) state.lab.fault_injection = enable;
      else state.lab = { fault_injection: enable };
      state.labChaosOut = enable
        ? t(state.locale, "podinfoFaultOn")
        : t(state.locale, "podinfoFaultOff");
      state.error = "";
      render();
    } catch (err) {
      state.error = String(err.message || err);
      render();
    }
  });
  root.querySelector("#lab-delay-btn")?.addEventListener("click", async () => {
    const sec = Number(root.querySelector("#lab-delay-sec")?.value || 0);
    try {
      const res = await fetch(`/delay/${sec}`, { headers: headers() });
      state.labChaosOut = t(state.locale, res.ok ? "podinfoTestOk" : "podinfoTestFail", {
        method: `GET /delay/${sec}`,
        status: String(res.status),
        error: res.ok ? "" : await res.text(),
      });
    } catch (err) {
      state.labChaosOut = t(state.locale, "podinfoTestFail", { error: String(err.message || err) });
    }
    render();
  });
  root.querySelector("#lab-status-btn")?.addEventListener("click", async () => {
    const code = Number(root.querySelector("#lab-status-code")?.value || 200);
    try {
      const res = await fetch(`/status/${code}`, { headers: headers() });
      state.labChaosOut = t(state.locale, "podinfoTestOk", {
        method: `GET /status/${code}`,
        status: String(res.status),
      });
    } catch (err) {
      state.labChaosOut = t(state.locale, "podinfoTestFail", { error: String(err.message || err) });
    }
    render();
  });
  root.querySelector("#metricsPanel")?.addEventListener("toggle", (e) => {
    state.labMetricsOpen = e.currentTarget.open;
  });
  const toast = root.querySelector("#endpointToast");
  const copyVal = async (value, el) => {
    try {
      await navigator.clipboard.writeText(value);
      if (toast) toast.textContent = t(state.locale, "copied", { value });
      el?.classList.add("copied");
      setTimeout(() => el?.classList.remove("copied"), 900);
    } catch {
      if (toast) toast.textContent = t(state.locale, "haCopyFailed");
    }
    if (toast) setTimeout(() => { if (toast.isConnected) toast.textContent = ""; }, 1800);
  };
  root.querySelectorAll("[data-copy-value]").forEach((el) => {
    el.addEventListener("click", () => copyVal(el.getAttribute("data-copy-value") || "", el));
  });
  root.querySelectorAll(".endpoint-chip").forEach((btn) => {
    btn.addEventListener("click", () => copyVal(btn.dataset.endpoint || btn.textContent.trim(), btn));
  });
  const pod = root.querySelector("#page-podinfo");
  if (pod && !reduceMotion) {
    pod.classList.remove("podinfo-enter");
    void pod.offsetWidth;
    pod.classList.add("podinfo-enter");
  }
}

/* ───────────────────────── render ───────────────────────── */

function activePageId() {
  const path = state.route;
  if (path.startsWith("/schedule")) return "schedule";
  if (path.startsWith("/restore")) return "restore";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/logs")) return "logs";
  if (path.startsWith("/podinfo")) return "podinfo";
  if (path.startsWith("/docs")) return "docs";
  return "dashboard";
}

function syncPollers(page) {
  if (page === "restore") {
    if (!restoreTimer) restoreTimer = setInterval(pollRestore, 3000);
  } else if (restoreTimer) {
    clearInterval(restoreTimer);
    restoreTimer = undefined;
  }
  if (page === "schedule") {
    if (!scheduleClockTimer) scheduleClockTimer = setInterval(paintClock, 10_000);
  } else if (scheduleClockTimer) {
    clearInterval(scheduleClockTimer);
    scheduleClockTimer = undefined;
  }
}

function renderApp() {
  if (!routeAllowed(state.route)) {
    state.toast = t(state.locale, "forbiddenToast");
    navigate(firstAllowedRoute(), { replace: true });
    return;
  }

  const page = activePageId();
  if (page !== "settings") state.avatarEdit = null;
  let body = "";
  if (page === "dashboard") body = pageDashboard();
  else if (page === "schedule") body = pageSchedule();
  else if (page === "restore") body = pageRestore();
  else if (page === "settings") body = pageSettings();
  else if (page === "logs") body = pageLogs();
  else if (page === "podinfo") body = pagePodinfo();
  else if (page === "docs") body = pageDocs();

  hideTooltip();
  const root = document.getElementById("app");
  root.innerHTML = shellStart(page) + body + shellEnd();
  bindShell(root);
  bindWorkloadIcons(root);
  bindTooltips(root);

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

  const scheduleForm = root.querySelector("#schedule-form");
  scheduleForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
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
      state.error = "";
    } catch (err) {
      state.error = String(err.message || err);
    }
    render();
  });
  scheduleForm?.addEventListener("input", paintClock);
  scheduleForm?.addEventListener("change", paintClock);

  if (page === "restore") bindRestore(root);
  if (page === "settings") bindSettings(root);
  if (page === "podinfo") {
    bindPodinfo(root);
    if (!state.labMetricsLoaded) {
      refreshLab({ metrics: true })
        .then(() => {
          state.labMetricsLoaded = true;
          if (activePageId() === "podinfo") render();
        })
        .catch((err) => {
          state.labMetricsLoaded = true;
          state.error = String(err.message || err);
          if (activePageId() === "podinfo") render();
        });
    }
  }

  root.querySelector("#log-pause")?.addEventListener("click", () => {
    state.logPaused = !state.logPaused;
    paintLogLines();
    const pauseBtn = root.querySelector("#log-pause");
    if (pauseBtn) pauseBtn.textContent = t(state.locale, state.logPaused ? "resume" : "pause");
    const stream = root.querySelector("#logStreamLabel");
    if (stream) stream.textContent = t(state.locale, state.logPaused ? "logPaused" : "logLive");
  });
  root.querySelector("#log-clear")?.addEventListener("click", async () => {
    await api("/api/v1/logs", { method: "DELETE" });
    state.logItems = [];
    paintLogLines();
  });
  root.querySelector("#logSearch")?.addEventListener("input", (e) => {
    state.logQuery = e.target.value || "";
    paintLogLines();
  });
  root.querySelector(".log-level-filters")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-level]");
    if (!btn) return;
    state.logLevelFilter = btn.dataset.level || "ALL";
    root.querySelectorAll(".log-level-filters button").forEach((b) => {
      b.setAttribute("aria-pressed", b === btn ? "true" : "false");
    });
    paintLogLines();
  });

  if (page === "logs") refreshLogBody();
  if (page === "schedule") paintClock();
  if (page === "dashboard" && state.kpiAnimate) {
    state.kpiAnimate = false;
    if (!reduceMotion) animateKpis(root);
  }
  if (state.logoPlay) {
    state.logoPlay = false;
    playLogoSetSail();
  }
  if (state.toast) {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      state.toast = "";
      document.querySelector(".toast")?.remove();
    }, 4000);
  }
  syncPollers(page);
  tickClock();

  if (state.pendingFocus) {
    const sel = state.pendingFocus;
    state.pendingFocus = "";
    root.querySelector(sel)?.focus();
  }
}

function render() {
  if (!state.me) {
    syncPollers("");
    renderLogin();
    return;
  }
  renderApp();
}

/* ───────────────────────── data ───────────────────────── */

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
  const [archives, jobs] = await Promise.all([
    api("/api/v1/restore/archives"),
    api("/api/v1/restore/jobs"),
  ]);
  state.archives = archives;
  state.jobs = jobs;
  const known = new Set([...(jobs.active || []), ...(jobs.recent || [])].map((j) => j.name));
  if (state.selectedJobName && !known.has(state.selectedJobName)) {
    state.selectedJobName = "";
    state.selectedJobLogs = "";
  }
  const target = logJobName();
  if (target) {
    try {
      const detail = await api(`/api/v1/restore/jobs/${encodeURIComponent(target)}`);
      state.selectedJobLogs = detail.logs || "";
    } catch (err) {
      if (err.status === 401) throw err;
    }
  } else {
    state.selectedJobLogs = "";
  }
}

function highlightLogMsg(msg, query) {
  const safe = escapeHtml(msg);
  const q = String(query || "").trim();
  if (!q) return safe;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(escaped, "gi"), (m) => `<mark>${m}</mark>`);
}

function paintLogLines() {
  const body = document.getElementById("log-body");
  const empty = document.getElementById("logEmpty");
  const count = document.getElementById("logCountLabel");
  if (!body) return;
  const q = (state.logQuery || "").trim().toLowerCase();
  const items = state.logItems || [];
  let visible = 0;
  body.innerHTML = items
    .map((e) => {
      const level = String(e.level || "INFO").toUpperCase();
      const time = new Date((e.ts || 0) * 1000).toLocaleTimeString(loc(), {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const msg = String(e.message || "");
      const hay = `${time} ${level} ${msg}`.toLowerCase();
      const show =
        (state.logLevelFilter === "ALL" || level === state.logLevelFilter) &&
        (!q || hay.includes(q));
      if (show) visible += 1;
      return `<div class="log-line level-${escapeHtml(level)}" data-level="${escapeHtml(level)}" ${show ? "" : "hidden"}>
        <span class="log-time">${escapeHtml(time)}</span>
        <span class="log-level">${escapeHtml(level)}</span>
        <span class="log-msg">${highlightLogMsg(msg, q)}</span>
      </div>`;
    })
    .join("");
  body.classList.toggle("is-paused", state.logPaused);
  if (count) {
    count.innerHTML =
      q || state.logLevelFilter !== "ALL"
        ? `<strong>${visible}</strong> ${escapeHtml(t(state.locale, "logCountOf", { total: items.length }))}`
        : `<strong>${items.length}</strong> ${escapeHtml(t(state.locale, "logCount"))}`;
  }
  empty?.classList.toggle("show", visible === 0);
  if (!state.logPaused && !q && state.logLevelFilter === "ALL") {
    body.scrollTop = body.scrollHeight;
  }
}

async function refreshLogBody() {
  if (!perms().logs) return;
  if (state.logPaused && state.logItems.length) {
    paintLogLines();
    return;
  }
  try {
    const data = await api("/api/v1/logs?limit=200");
    if (data?.items) state.logItems = data.items;
    paintLogLines();
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
  await Promise.all([refreshWorkloads(), refreshSchedule(), refreshRestore(), refreshLabIfAllowed()]);
}

async function refreshLabIfAllowed({ metrics = false } = {}) {
  if (!perms().podinfo) {
    state.lab = null;
    return;
  }
  await refreshLab({ metrics });
}

async function boot() {
  applyChrome();
  state.route = location.pathname;
  state.kpiAnimate = true;
  state.logoPlay = state.logoAnim === "setsail";
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
  state.kpiAnimate = true;
  render();
});
boot();
