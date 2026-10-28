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

  function start() {
    injectAuthBadges();

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        injectAuthBadges();
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
