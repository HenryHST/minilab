# Baseline Alerting — Design & Implementation

**Status:** Accepted — **V1 (PrometheusRule) + V2 (Loki Ruler)**, E-Mail only,
critical/warning getrennt geroutet, Chart-`defaultRules` behalten, Proxmox in Baseline.

Ziel: Baseline-Alarming für das Minilab über **Prometheus**, **Loki**, **Grafana**,
**Alertmanager** (Node-/Workload-Signale, Proxmox Metrics + Syslog).

---

## Entscheidungen

| Frage | Antwort |
|-------|---------|
| Ansatz | V1 + V2 |
| Notification | E-Mail (`info@henrystadthagen.de`) |
| Routing | critical vs warning getrennt (Subject + Repeat-Intervall) |
| Chart `defaultRules` | behalten |
| Proxmox / pve-exporter | Teil von Baseline v1 |

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
| Metrics / Workload / Proxmox | `manifests/homelab-alerts.yaml` |
| Chart defaults (Node CPU/RAM/Disk, kube apps, …) | `values.yaml` → `defaultRules` |
| Alertmanager Routing | `values.yaml` → `alertmanager.config` |
| Log alerts (Proxmox syslog) | `infra/loki/manifests/loki-alerting-rules.yaml` + `infra/loki/values.yaml` `rulerConfig` |

Grafana bleibt Visualisierung + Alertmanager-Datasource (`handleGrafanaManagedAlerts: false`).

---

## Severity & Routing

| Severity | Receiver | `group_wait` | `repeat_interval` | Subject-Prefix |
|----------|----------|--------------|-------------------|----------------|
| `critical` | `email-critical` | 0s | 4h | `[CRITICAL][minilab]` |
| `warning` | `email-warning` | 30s | 12h | `[WARNING][minilab]` |

Inhibit (Auszug): critical unterdrückt warning bei gleichem `namespace`+`pod`;
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
infra/kube-prometheus-stack/tests/run-tests.sh
```

Nutzt `promtool check rules` + `promtool test rules` (Fixtures für Deployment,
CrashLoop, PVENodeDown, PVEStorageAlmostFull).

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
| ContainerOOMKilled | Memory Limit erhöhen; Leak prüfen |
| PVENodeDown / PVEExporterDown | Node/Exporter-Host erreichbar? Credentials? |
| PVEStorageAlmostFull | Storage aufräumen / erweitern auf Proxmox |
| ProxmoxSyslogKernelOOM | RAM auf dem Host; QEMU Ballooning / Overcommit |
| CertificateExpiringSoon | `kubectl describe certificate`; cert-manager Logs |

---

## Offene Follow-ups (nicht Baseline)

- Weitere Notification-Kanäle (ntfy/Telegram)
- Gast-spezifische PVE-Alerts (Whitelist laufender VMs)
- Pod-Log-Pipeline in Alloy (aktuell nur Syslog)
- Silence-/Maintenance-Automation
