# Grafana Alloy — Host syslog → Loki

Receives RFC3164 syslog from Proxmox (`pve01`/`pve02`/`pve03`) and Pi agents
(`pi1cl`/`pi2cl`/`pi4cl`/`pi7cl`) and pushes to in-cluster Loki.

| Item | Value |
|------|--------|
| LB IP | `192.168.0.217` (Cilium pool) |
| Port | **1514** UDP/TCP |
| Loki | `http://loki-gateway.monitoring.svc.cluster.local/loki/api/v1/push` |
| Grafana | `{job="syslog"}` or host/src_ip filters below |

## Proxmox rsyslog (each node)

Proxmox uses **journald only** by default — install rsyslog first:

```bash
apt-get install -y rsyslog
```

Create `/etc/rsyslog.d/30-alloy.conf`:

```
# Forward all facilities to Alloy in k3s (UDP, RFC3164).
*.* @192.168.0.217:1514
```

Then:

```bash
systemctl enable --now rsyslog
logger -t alloy-test "hello from $(hostname)"
```

TCP alternative: `*.* @@192.168.0.217:1514` (double `@`).

Optional DNS: `syslog.stadthagen.dev` → `192.168.0.217` (UniFi/Hetzner LAN record) and use that hostname in rsyslog.

## Grafana

Dashboard **Proxmox Syslog** (folder Proxmox):

| Panel | Query |
|-------|--------|
| all | `{job="syslog"} \| host=~"pve0[1-3].*" or src_ip=~"192.168.0.10[89]\|192.168.0.110"` |
| pve01 | `{job="syslog"} \| host=~"pve01.*" or src_ip="192.168.0.110"` |
| pve02 | `{job="syslog"} \| host=~"pve02.*" or src_ip="192.168.0.108"` |
| pve03 | `{job="syslog"} \| host=~"pve03.*" or src_ip="192.168.0.109"` |

Dashboard **Pi Syslog** (folder nXk3) — ConfigMap
[`dashboard-pi-syslog.yaml`](../kube-prometheus-stack/manifests/dashboard-pi-syslog.yaml).
Pi rsyslog via Infra_LAB Ansible: `site.yaml --tags rsyslog --limit raspberrypi`.

| Panel | Query |
|-------|--------|
| all | `{job="syslog"} \| host=~"pi[1247]cl.*" or src_ip=~"192.168.0.10(1\|2\|4\|7)"` |
| pi1cl | `{job="syslog"} \| host=~"pi1cl.*" or src_ip="192.168.0.101"` |
| pi2cl | `{job="syslog"} \| host=~"pi2cl.*" or src_ip="192.168.0.102"` |
| pi4cl | `{job="syslog"} \| host=~"pi4cl.*" or src_ip="192.168.0.104"` |
| pi7cl | `{job="syslog"} \| host=~"pi7cl.*" or src_ip="192.168.0.107"` |

`or` must be in the LogQL **pipeline** (after `|`), not between two stream selectors.

## Alerting

Loki Ruler evaluates syslog LogQL alerts and sends them to Alertmanager
(`apps/monitoring/loki/manifests/loki-alerting-rules.yaml`). Overview:
[`apps/monitoring/kube-prometheus-stack/ALERTING.md`](../kube-prometheus-stack/ALERTING.md).
