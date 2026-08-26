# Grafana Alloy — Proxmox syslog → Loki

Receives RFC3164 syslog from `pve01`/`pve02`/`pve03` and pushes to in-cluster Loki.

| Item | Value |
|------|--------|
| LB IP | `192.168.0.217` (Cilium pool) |
| Port | **1514** UDP/TCP |
| Loki | `http://loki-gateway.loki.svc.cluster.local/loki/api/v1/push` |
| Grafana | `{job="syslog"}` or `{job="syslog", host="pve02"}` |

## Proxmox rsyslog (each node)

Create `/etc/rsyslog.d/30-alloy.conf`:

```
# Forward all facilities to Alloy in k3s (UDP, RFC3164).
*.* @192.168.0.217:1514
```

Then:

```bash
systemctl restart rsyslog
logger -t alloy-test "hello from $(hostname)"
```

TCP alternative: `*.* @@192.168.0.217:1514` (double `@`).

Optional DNS: `syslog.stadthagen.dev` → `192.168.0.217` (UniFi/Hetzner LAN record) and use that hostname in rsyslog.

## Verify

```bash
kubectl -n alloy get pods,svc
kubectl -n alloy logs deploy/alloy --tail=50
# Grafana Explore → Loki → {job="syslog"}
```
