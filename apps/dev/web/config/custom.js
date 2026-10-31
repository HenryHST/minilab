(() => {
  const AUTH_BADGES = {
    authentik: {
      label: "OIDC",
      title: "Anmeldung über Authentik (OIDC)",
      kind: "oidc",
    },
    forgejo: {
      label: "OIDC",
      title: "Anmeldung über Authentik (OIDC)",
      kind: "oidc",
    },
    excalidash: {
      label: "OIDC",
      title: "Anmeldung über Authentik (OIDC)",
      kind: "oidc",
    },
    termix: {
      label: "OIDC",
      title: "Anmeldung über Authentik (OIDC)",
      kind: "oidc",
    },
    vaultwarden: {
      label: "SSO",
      title: "Single Sign-On über Authentik",
      kind: "sso",
    },
    bytestash: {
      label: "OIDC",
      title: "Anmeldung über Authentik (OIDC)",
      kind: "oidc",
    },
    audiobookshelf: {
      label: "OIDC",
      title: "Anmeldung über Authentik (OIDC)",
      kind: "oidc",
    },
    hubble: {
      label: "SSO",
      title: "Single Sign-On über Authentik",
      kind: "sso",
    },
  };

  const ROBOT_POLL_MS = 10000;
  const ROBOT_ROOT_ID = "nxk3-robot-root";

  function ensureBadge(serviceId, meta) {
    const root = document.getElementById(serviceId);
    if (!root || root.querySelector(`.auth-badge[data-auth-id="${serviceId}"]`)) {
      return;
    }

    const badge = document.createElement("span");
    badge.className = `auth-badge auth-badge--${meta.kind}`;
    badge.textContent = meta.label;
    badge.title = meta.title;
    badge.setAttribute("data-tooltip", meta.title);
    badge.setAttribute("data-auth-id", serviceId);
    badge.setAttribute("tabindex", "0");
    badge.setAttribute("role", "note");
    badge.setAttribute("aria-label", meta.title);

    const nameEl = root.querySelector(".service-name");
    if (!nameEl) {
      root.appendChild(badge);
      return;
    }

    const desc = nameEl.querySelector(".service-description");
    if (desc) {
      nameEl.insertBefore(badge, desc);
    } else {
      nameEl.appendChild(badge);
    }
  }

  function injectAuthBadges() {
    Object.entries(AUTH_BADGES).forEach(([serviceId, meta]) => {
      ensureBadge(serviceId, meta);
    });
  }

  /**
   * Map Homepage kubernetes widget payload → robot-heads state.
   * all ready → happy; some not ready → thinking; none ready or API error → error
   */
  function mapClusterToRobotState(payload) {
    if (!payload || payload.error || !Array.isArray(payload.nodes) || payload.nodes.length === 0) {
      return {
        state: "error",
        title: "nXk3: Kubernetes-Status nicht verfügbar",
      };
    }

    const ready = payload.nodes.filter((n) => n.ready === true);
    const notReady = payload.nodes.filter((n) => n.ready !== true);
    const total = payload.nodes.length;
    const readyCount = ready.length;

    if (readyCount === total) {
      return {
        state: "happy",
        title: `nXk3: ${readyCount}/${total} Ready`,
      };
    }

    if (readyCount === 0) {
      const names = notReady
        .map((n) => n.name)
        .slice(0, 5)
        .join(", ");
      return {
        state: "error",
        title: `nXk3: 0/${total} Ready${names ? ` (${names})` : ""}`,
      };
    }

    const names = notReady
      .map((n) => n.name)
      .slice(0, 5)
      .join(", ");
    return {
      state: "thinking",
      title: `nXk3: ${readyCount}/${total} Ready — down: ${names}`,
    };
  }

  function ensureRobotRoot() {
    let el = document.getElementById(ROBOT_ROOT_ID);
    if (el) {
      return el;
    }
    el = document.createElement("div");
    el.id = ROBOT_ROOT_ID;
    el.className = "nxk3-robot-mascot";
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    return el;
  }

  function startRobotMascot() {
    if (window.__nxk3RobotStarted) {
      return;
    }
    window.__nxk3RobotStarted = true;

    const mount = ensureRobotRoot();
    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
import { React, useEffect, useState, createRoot, RobotHead } from "/vendor/nxk3-robot.mjs";

const POLL_MS = ${ROBOT_POLL_MS};
const mountEl = document.getElementById("${ROBOT_ROOT_ID}");
if (!mountEl) {
  throw new Error("nxk3 robot mount missing");
}

function mapClusterToRobotState(payload) {
  if (!payload || payload.error || !Array.isArray(payload.nodes) || payload.nodes.length === 0) {
    return { state: "error", title: "nXk3: Kubernetes-Status nicht verfügbar" };
  }
  const ready = payload.nodes.filter((n) => n.ready === true);
  const notReady = payload.nodes.filter((n) => n.ready !== true);
  const total = payload.nodes.length;
  const readyCount = ready.length;
  if (readyCount === total) {
    return { state: "happy", title: \`nXk3: \${readyCount}/\${total} Ready\` };
  }
  if (readyCount === 0) {
    const names = notReady.map((n) => n.name).slice(0, 5).join(", ");
    return { state: "error", title: \`nXk3: 0/\${total} Ready\${names ? \` (\${names})\` : ""}\` };
  }
  const names = notReady.map((n) => n.name).slice(0, 5).join(", ");
  return { state: "thinking", title: \`nXk3: \${readyCount}/\${total} Ready — down: \${names}\` };
}

function Mascot() {
  const [state, setState] = useState("thinking");
  const [title, setTitle] = useState("nXk3: prüfe Cluster…");

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    async function poll() {
      if (document.visibilityState === "hidden") {
        return;
      }
      try {
        const res = await fetch("/api/widgets/kubernetes?lang=de", {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const mapped = !res.ok
          ? { state: "error", title: "nXk3: Kubernetes-Status nicht verfügbar" }
          : mapClusterToRobotState(data);
        setState(mapped.state);
        setTitle(mapped.title);
        mountEl.title = mapped.title;
      } catch (_) {
        if (cancelled) return;
        setState("error");
        setTitle("nXk3: Kubernetes-Status nicht verfügbar");
        mountEl.title = "nXk3: Kubernetes-Status nicht verfügbar";
      }
    }

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await poll();
        if (!cancelled) schedule();
      }, POLL_MS);
    }

    poll().then(() => {
      if (!cancelled) schedule();
    });

    const onVis = () => {
      if (document.visibilityState === "visible") {
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return React.createElement(RobotHead, {
    state,
    size: 100,
    shape: "circle",
    antenna: true,
    interactive: true,
    floorShadow: true,
    speed: 1,
    color: "#2b49a3",
    trimColor: "#93a6c8",
    screenColor: "#e8f2ff",
    "aria-label": title,
  });
}

createRoot(mountEl).render(React.createElement(Mascot));
`;
    script.onerror = () => {
      mount.title = "nXk3: robot-heads konnte nicht geladen werden (CSP/Netz?)";
      console.warn("[nxk3-robot] failed to load /vendor/nxk3-robot.mjs");
    };
    document.head.appendChild(script);

    // Keep map helper referenced so config reviewers see the contract outside the module string.
    void mapClusterToRobotState;
  }

  function start() {
    injectAuthBadges();
    startRobotMascot();

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        injectAuthBadges();
        ensureRobotRoot();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
