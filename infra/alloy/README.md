# Grafana Alloy — Proxmox syslog → Loki

Receives RFC3164 syslog from `pve01`/`pve02`/`pve03` and pushes to in-cluster Loki.

| Item | Value |
|------|--------|
| LB IP | `192.168.0.217` (Cilium pool) |
| Port | **1514** UDP/TCP |
| Loki | `http://loki-gateway.monitoring.svc.cluster.local/loki/api/v1/push` |
| Grafana | `{job="syslog"}` or `{job="syslog", host="pve02"}` |

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
| all | `{job="syslog"}` |
| pve01 | `{job="syslog"} \| host=~"pve01.*" or src_ip="192.168.0.110"` |
| pve02 | `{job="syslog"} \| host=~"pve02.*" or src_ip="192.168.0.108"` |
| pve03 | `{job="syslog"} \| host=~"pve03.*" or src_ip="192.168.0.109"` |

`or` must be in the LogQL **pipeline** (after `|`), not between two stream selectors.
