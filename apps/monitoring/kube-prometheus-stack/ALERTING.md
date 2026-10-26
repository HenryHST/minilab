# Baseline Alerting — Design & Implementation

**Status:** Accepted — **V1 (PrometheusRule) + V2 (Loki Ruler)**, E-Mail only,
critical/warning getrennt geroutet, Chart-`defaultRules` behalten, Proxmox **und
Cilium** in Baseline.

Ziel: Baseline-Alarming für das Minilab über **Prometheus**, **Loki**, **Grafana**,
**Alertmanager** (Node-/Workload-Signale, Proxmox Metrics + Syslog, Cilium CNI).

---

## Entscheidungen

| Frage | Antwort |
|-------|---------|
| Ansatz | V1 + V2 |
| Notification | E-Mail (`info@henrystadthagen.de`) |
| Routing | critical vs warning getrennt (Subject + Repeat-Intervall) |
| Chart `defaultRules` | behalten |
| Proxmox / pve-exporter | Teil von Baseline v1 |
| Cilium / Hubble metrics | Teil von Baseline v1 (PodMonitors + Rules) |

---

## Architektur

```text
Prometheus ──PrometheusRule──┐
                             ├──► Alertmanager ──SMTP──► E-Mail
Loki Ruler ──LogQL rules─────┘         ▲
                                       │
Grafana (Datasource Alertmanager, UI) ─┘
```

| Quelle | Artefakt |
|--------|----------|
| Metrics / Workload / Proxmox / Cilium | `manifests/homelab-alerts.yaml` |
| Node / Longhorn manager stability | `manifests/nxk3-node-stability.yaml` |
| Longhorn RWX share / IM OutOfcpu | `manifests/longhorn-share-alerts.yaml` |
| Authentik IdP / CNPG / Redis | `manifests/authentik-alerts.yaml` |
| Gatus meta (+ IdP dependency) | `manifests/gatus-alerts.yaml` |
| Cilium scrape (agent/operator/hubble) | `manifests/cilium-podmonitors.yaml` |
| Chart defaults (Node CPU/RAM/Disk, kube apps, …) | `values.yaml` → `defaultRules` |
| Alertmanager Routing | `values.yaml` → `alertmanager.config` |
| Log alerts (Proxmox syslog) | `apps/monitoring/loki/manifests/loki-alerting-rules.yaml` + `apps/monitoring/loki/values.yaml` `rulerConfig` |

Grafana bleibt Visualisierung + Alertmanager-Datasource (`handleGrafanaManagedAlerts: false`).

---

## Severity & Routing

| Severity | Receiver | `group_wait` | `repeat_interval` | Subject-Prefix |
|----------|----------|--------------|-------------------|----------------|
| `critical` | `email-critical` | 0s | 4h | `[CRITICAL][minilab]` |
| `warning` | `email-warning` | 30s | 12h | `[WARNING][minilab]` |

Zusätzlich (vor dem Severity-Routing, `continue: true`):

| Matcher | Receiver | Zweck |
|---------|----------|--------|
| `alertname = NXk3PiNodeNotReady` | `homeassistant-pi` | Webhook → Home Assistant **ha02** (`192.168.0.106`) — Agent-Restart / Reboot |

Webhook-URL liegt in Secret `monitoring/alertmanager-ha-webhook` Key `url` (SecretSpec `HA_NXK3_WEBHOOK_URL`, z. B. `http://192.168.0.106:8123/api/webhook/nxk3-pi-notready`). Mount: `alertmanagerSpec.secrets`. Ohne Secret bleibt der Receiver konfiguriert, Webhooks failen bis `--tags secrets`.

Inhibit (Auszug): critical unterdrückt warning bei gleichem `namespace`+`alertname`
(nicht `pod` — kube-state-metrics-Alerts teilen sonst denselben Pod und würden
`NXk3PiNodeNotReady` unter `NXk3NodeNotReady` suppressen und den HA-Webhook blockieren);
`PVENodeDown` unterdrückt warning mit gleichem `instance`.

---

## Alert-Gruppen (Custom)

### `baseline.workload`

- ContainerRestartingFrequently (warning)
- DeploymentUnavailable (critical)
- PodCrashLooping (critical)
- ContainerOOMKilled (warning)
- PodNotReady (warning)
- PersistentVolumeClaimPending (warning)

### `baseline.platform`

- ArgoCDAppDegraded / ArgoCDAppSyncStuck (warning)
- CertificateExpiringSoon (warning)
- KubeHpaMaxedOut (warning; Chart-Default disabled, custom behalten)

### `baseline.proxmox` (pve-exporter Jobs `pexpve01`–`03`)

- PVEExporterDown, PVENodeDown, PVEClusterNotQuorate (critical)
- PVEHighCPUUsage / PVEHighMemoryUsage (Nodes, warning)
- PVEStorageFillingUp (warning) / PVEStorageAlmostFull (critical)
- PVEReplicationFailed (warning)

Bewusst **nicht** enthalten: „alle gestoppten VMs/CTs“ und „Guest not backed up“
(zu noisy im Lab).

### `baseline.cilium` (PodMonitors → Jobs `cilium-agent` / `cilium-operator` / `cilium-hubble`)

- CiliumDaemonSetUnavailable (critical; via kube-state-metrics)
- CiliumAgentDown / CiliumOperatorDown (critical; scrape `up`)
- CiliumControllersFailing (warning)
- CiliumBpfMapPressure (warning, >90%)
- CiliumHighDropRate (warning, >100 pkt/s)
- CiliumUnreachableNodes (warning)

**Voraussetzung (außerhalb dieses Repos):** Cilium-Helm muss Metrics exponieren, z. B.:

```bash
helm upgrade cilium cilium/cilium -n kube-system --reuse-values \
  --set prometheus.enabled=true \
  --set operator.prometheus.enabled=true \
  --set hubble.enabled=true \
  --set hubble.metrics.enabled="{drop,tcp,flow,icmp,dns}"
```

Ports: Agent `9962`, Operator `9963`, Hubble `9965`. Ohne Metrics-Listener bleiben
Agent/Operator-`up`-Alerts aus (keine Targets); DaemonSet-Alert greift trotzdem.

### Loki `baseline.proxmox.syslog`

- ProxmoxSyslogHighErrorRate (warning)
- ProxmoxSyslogKernelOOM (critical)
- ProxmoxSyslogDiskErrors (critical)

Node-CPU/RAM/Disk für **k3s-Nodes** kommen aus Chart-`defaultRules`
(`node`, `nodeExporterAlerting`, `kubernetesStorage`, …).

---

## Testing

### PrometheusRules

```bash
apps/monitoring/kube-prometheus-stack/tests/run-tests.sh
```

Nutzt `promtool check rules` + `promtool test rules` (Fixtures für Deployment,
CrashLoop, PVE, Cilium BPF-Map / DaemonSet).

### Loki Rules

Nach Deploy:

1. Sidecar hat Rules unter `/rules/fake` (Annotation `loki_ruler_tenant: fake`).
2. Loki ruler API / Grafana Explore: LogQL der Alerts manuell prüfen.
3. Optional: `logger -t alloy-test "Out of memory test"` auf einem PVE-Host →
   Alert in Alertmanager (danach Silence).

### Smoke Alertmanager

- Alertmanager UI: Routes `email-critical` / `email-warning`.
- Subject-Zeile der Test-Mail prüfen.

---

## Runbook (Kurz)

| Alert | Erste Schritte |
|-------|----------------|
| DeploymentUnavailable / PodCrashLooping | `kubectl -n <ns> describe` / logs `--previous`; Image/Probe/Limits |
| GatusDeploymentUnavailable / GatusScrapeDown / GatusPostgresInstancesMissing | `kubectl -n status get deploy,pods,cluster`; Secrets `gatus-env`/`gatus-db`; README Runbook |
| ContainerOOMKilled | Memory Limit erhöhen; Leak prüfen |
| PVENodeDown / PVEExporterDown | Node/Exporter-Host erreichbar? Credentials? |
| PVEStorageAlmostFull | Storage aufräumen / erweitern auf Proxmox |
| CiliumDaemonSetUnavailable / CiliumAgentDown | `kubectl -n kube-system get ds,pods -l k8s-app=cilium`; Metrics enabled? |
| CiliumBpfMapPressure | Map-Kapazität / Cilium-Version; Docs zu map pressure |
| CiliumHighDropRate | NetworkPolicies (PolicyDenied) vs. Datapath; Hubble flows |
| ProxmoxSyslogKernelOOM | RAM auf dem Host; QEMU Ballooning / Overcommit |
| CertificateExpiringSoon | `kubectl describe certificate`; cert-manager Logs |

---

## Offene Follow-ups (nicht Baseline)

- Weitere Notification-Kanäle (ntfy/Telegram)
- Gast-spezifische PVE-Alerts (Whitelist laufender VMs)
- Pod-Log-Pipeline in Alloy (aktuell nur Syslog)
- Silence-/Maintenance-Automation
