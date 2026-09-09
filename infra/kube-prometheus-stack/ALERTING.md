# Baseline Alerting — Design & Vorschläge

Ziel: **Baseline-Alarming** für das Minilab über den vorhandenen Stack
(**Prometheus**, **Loki**, **Grafana**, **Alertmanager**), mit Fokus auf
Node-Auslastung, Pod-/Workload-Probleme und Plattform-Signale.

Dieser Branch startet mit Vorschlägen und einem Test-/Doku-Plan.
Die konkrete Rule-/Routing-Implementierung folgt nach Auswahl eines Ansatzes.

---

## Ist-Zustand

| Komponente | Status |
|------------|--------|
| Prometheus + Operator | aktiv (`kube-prometheus-stack`) |
| Alertmanager | aktiv, Receiver `email` → `info@henrystadthagen.de` |
| Grafana | Datasource Alertmanager vorhanden; `handleGrafanaManagedAlerts: false` |
| Loki + Alloy | Logs (u. a. Proxmox syslog); **kein** Loki Ruler / keine Log-Alerts |
| Chart `defaultRules` | großzügig aktiv (`node`, `nodeExporterAlerting`, `kubernetesApps`, …) |
| Custom Rules | `manifests/homelab-alerts.yaml` (Restarts, CrashLoop, OOM, Deployments, Argo CD, Certs, HPA) |

Lücken für ein bewusstes „Baseline“-Set:

- Keine klare Priorisierung / Severity-Matrix (was ist warning vs. critical).
- Kein Inhibit-/Silence-/Routing nach Severity oder Namespace.
- Keine dokumentierten Thresholds für Node CPU/RAM/Disk (nur Chart-Defaults).
- Keine Log-basierten Alerts (Loki).
- Kein systematischer Test-/Smoke-Pfad für Rules.

---

## Scope Baseline (Vorschlag)

### Metrics (Prometheus)

| Bereich | Beispiel-Alerts |
|---------|-----------------|
| Node | CPU hoch, Memory hoch, Disk fast voll, Node NotReady |
| Workloads | CrashLoopBackOff, häufige Restarts, OOMKilled, Deployment 0/desired |
| Storage | PVC nearly full / pending |
| Plattform | Cert bald abgelaufen, Argo CD unhealthy/OutOfSync (bereits teilweise vorhanden) |
| Monitoring self | Prometheus/Alertmanager down (Chart-Defaults) |

### Optional später (nicht Baseline v1)

- Proxmox-spezifische pve-exporter Alerts
- UniFi / Home Assistant / Authentik fachliche SLOs
- Loki: Kernel-OOM, disk errors, auth failures aus Syslog

---

## Vorschlag 1 — PrometheusRule-first (empfohlen für GitOps)

**Idee:** Alle Baseline-Alerts als `PrometheusRule` CRs (GitOps in
`infra/kube-prometheus-stack/manifests/`). Alertmanager bleibt die einzige
Routing-/Notification-Ebene. Grafana nur Visualisierung + Alertmanager-UI.

### Umsetzung

1. Chart-`defaultRules` bewusst kuratieren (Noise off, sinnvolle Defaults an).
2. `homelab-alerts.yaml` erweitern bzw. in Gruppen splitten:
   - `baseline.node`
   - `baseline.workload`
   - `baseline.storage`
   - `baseline.platform` (bestehende Argo/Cert-Rules)
3. Alertmanager `route` nach `severity` (critical → sofort, warning → grouped).
4. Optional: Inhibit-Rules (z. B. NodeDown unterdrückt Pod-Alerts auf dem Node).

### Vor- / Nachteile

| + | − |
|---|---|
| Passt zum bestehenden GitOps (ApplicationSet plain YAML) | Keine Log-Alerts ohne Extra-Komponente |
| Rules versioniert, reviewbar, Argo-synced | Threshold-Tuning braucht Cluster-Messwerte |
| Alertmanager bereits verdrahtet | Grafana Unified Alerting bleibt ungenutzt |

### Wann wählen

Wenn Baseline primär **Cluster-Gesundheit** (Nodes/Pods) sein soll und
GitOps-First Priorität hat.

---

## Vorschlag 2 — Hybrid Metrics + Loki (Prometheus + Loki Ruler → Alertmanager)

**Idee:** Metrics-Alerts wie in Vorschlag 1. Zusätzlich **Loki Ruler**
(oder Grafana Alloy mit Rule-Eval) für Log-basierte Alerts; beide feuern an
denselben Alertmanager.

### Umsetzung

1. Alles aus Vorschlag 1 für Metrics.
2. Loki Ruler aktivieren (Helm `infra/loki/values.yaml`) oder separate
   `loki-ruler` Rules als ConfigMap/CR.
3. LogQL-Beispiele:
   - Proxmox syslog: `error`/`fail` Bursts pro Host
   - Optional später: Pod-Logs via Alloy (aktuell nur Syslog)
4. Alertmanager labelt Quelle (`source=prometheus|loki`).

### Vor- / Nachteile

| + | − |
|---|---|
| Deckt Signale, die Metrics nicht zeigen | Mehr Betriebsaufwand (Ruler, Storage, Rule-Eval) |
| Nutzt vorhandenes Loki/Alloy | Syslog-Noise → False Positives |
| Ein Notification-Kanal (Alertmanager) | Baseline wird breiter als „minilab k8s“ |

### Wann wählen

Wenn Baseline auch **Host-/Infra-Logs** (Proxmox) abdecken soll.

---

## Vorschlag 3 — Grafana Unified Alerting → Alertmanager

**Idee:** Rules in Grafana (PromQL + LogQL in einer UI), Weiterleitung an
Alertmanager. Datasource-Flag `handleGrafanaManagedAlerts` auf `true`.

### Umsetzung

1. Grafana Alerting Rules (provisioniert als YAML/JSON oder UI → export).
2. Contact point = Alertmanager.
3. Bestehende PrometheusRules schrittweise reduzieren oder parallel lassen
   (Doppel-Alerts vermeiden).

### Vor- / Nachteile

| + | − |
|---|---|
| Schnelles Prototyping, gemischte Datasources | Schlechter GitOps-Fit (State oft in Grafana DB/PVC) |
| Gute UX zum Threshold-Tuning | Drift zwischen Cluster und Repo möglich |
| Ein Ort für Metrics + Logs | Aktuell bewusst `handleGrafanaManagedAlerts: false` |

### Wann wählen

Wenn schnelles Experimentieren wichtiger ist als reine GitOps-Rules —
oder als **Tuning-Labor**, bevor Rules nach Vorschlag 1/2 zurückportiert werden.

---

## Vergleich (Kurz)

| Kriterium | V1 PrometheusRule | V2 Hybrid + Loki | V3 Grafana UA |
|-----------|-------------------|------------------|---------------|
| GitOps | stark | stark (Rules) | schwach–mittel |
| Node/Pods Metrics | ja | ja | ja |
| Log-Alerts | nein | ja | ja |
| Komplexität | niedrig | mittel | mittel |
| Passt zum Ist | am besten | gut erweiterbar | Abweichung vom Ist |

**Empfehlung:** Mit **Vorschlag 1** Baseline v1 liefern; Log-Alerts als
**Phase 2** (Vorschlag 2) nachziehen. Vorschlag 3 nur für Spike/Tuning.

---

## Testing

### Statisch (CI / lokal)

- YAML-Validierung der `PrometheusRule` Manifeste.
- Optional: [`promtool check rules`](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
  gegen die Rule-Dateien (Unit-ähnlich).
- `promtool test rules` mit Fixture-Series für kritische Expressions
  (CrashLoop, Disk full, Node NotReady).

### Smoke im Cluster (nach Deploy)

1. Alertmanager UI / Grafana Explore: Rules loaded?
2. Synthetischer Fail:
   - Deployment mit CrashLoop-Image in Namespace `monitoring` oder `default`
     (kurzzeitig, labeled `alert-test=true`).
   - Optional: `amtool alert add` / Test-Webhook Receiver.
3. Prüfen: Alert erscheint in Alertmanager, E-Mail kommt (oder Test-Receiver).
4. Aufräumen + Silence-Dokumentation.

### Regression

- Nach Chart-Upgrades: Diff der `defaultRules` (welche Alerts neu/entfernt).
- Noise-Review nach 7 Tagen: Silence-Liste → Thresholds anpassen.

---

## Dokumentation (geplant mit Implementierung)

| Artefakt | Inhalt |
|----------|--------|
| Diese Datei `ALERTING.md` | Design, gewählter Ansatz, Severity-Matrix |
| `README.md` (Repo-Abschnitt Monitoring) | Link + Kurzbeschreibung Baseline |
| Rule-Annotations | `summary` / `description` + kubectl-Hint (wie heute) |
| Runbook-Abschnitt | Was tun bei NodeHighCPU, PodCrashLoop, DiskAlmostFull |
| CHANGELOG | Eintrag bei Einführung / Threshold-Änderungen |

Severity-Vorschlag:

| Severity | Bedeutung | Beispiel |
|----------|-----------|----------|
| `critical` | Nutzer-/Cluster-Impact, sofort | Node NotReady, Deployment 0 replicas, Disk >95% |
| `warning` | Degradation / frühzeitig | CPU >85% 15m, Restarts, Cert <7d |
| `info` | optional, oft stumm | HPA near max (nur Dashboard) |

---

## Offene Fragen (bitte entscheiden)

1. **Welcher Vorschlag?** V1 / V2 / V3 (oder V1 jetzt + V2 später)?
2. **Notification:** nur E-Mail, oder zusätzlich Telegram/Discord/ntfy/Webhook?
3. **Routing:** eine Inbox für alles, oder Trennung critical vs. warning
   (andere Adresse / Digest)?
4. **Namespaces:** Alerts cluster-weit oder bestimmte Namespaces
   (`kube-system`, `monitoring`, Apps) priorisieren / andere inhibieren?
5. **defaultRules:** Chart-Defaults behalten und nur ergänzen, oder stark
   ausdünnen und fast alles custom?
6. **Proxmox/pve-exporter:** Teil von Baseline v1 oder Phase 2?
7. **Maintenance:** Sollen geplante Fenster über Alertmanager Silences
   (API/UI) oder per Label/Annotation in Apps gesteuert werden?

---

## Nächste Schritte (nach Entscheidung)

1. Gewählten Ansatz in diesem Doc als „Accepted“ markieren.
2. Rule-Set + Alertmanager-Routing implementieren.
3. `promtool`-Tests und kurzes Runbook ergänzen.
4. Deploy via Argo, Smoke-Test, Threshold-Nachjustierung.
