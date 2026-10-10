---
title: Quellen
book_version: "1.0.0"
---

# Quellen

- App: [`apps/ops/wud/`](https://github.com/HenryHST/minilab/tree/main/apps/ops/wud)
- Dashboard: [`dashboard-wud.yaml`](https://github.com/HenryHST/minilab/blob/main/apps/monitoring/kube-prometheus-stack/manifests/dashboard-wud.yaml), Alerts: [`wud-alerts.yaml`](https://github.com/HenryHST/minilab/blob/main/apps/monitoring/kube-prometheus-stack/manifests/wud-alerts.yaml)
- Diagramme: [`wud-architektur.html`](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/wud-architektur.html), [`wud-update-flow.html`](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/wud-update-flow.html)
- Infra_LAB: `terraform/authentik/modules/dev/authentik_wupd.tf`, `authentik_mosquitto_ldap.tf` (`mqtt-wud`), `ansible/playbooks/k3s_cluster/secrets/` (`wud-env`)
- WUD-Doku: https://getwud.app/docs/
  - Kubernetes-Watcher: https://getwud.app/docs/configuration/watchers/kubernetes/
  - OIDC/Authentik: https://getwud.app/docs/configuration/authentications/oidc/#how-to-integrate-with-authentik
  - Pushover: https://getwud.app/docs/configuration/triggers/pushover/
  - MQTT: https://getwud.app/docs/configuration/triggers/mqtt/
  - Custom Registry: https://getwud.app/docs/configuration/registries/custom/
  - Trigger-Optionen (MODE, ONCE, THRESHOLD): https://getwud.app/docs/configuration/triggers/
  - Monitoring: https://getwud.app/docs/monitoring/
- Quellcode und Releases: https://github.com/getwud/wud (Tag `9.3.0`)
