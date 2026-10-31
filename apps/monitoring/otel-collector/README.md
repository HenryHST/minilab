# otel-collector

Minimal OpenTelemetry Collector — **OTLP edge / gateway** for workloads that should not talk to Prometheus directly.

## Endpoints

| Role | URL |
|------|-----|
| OTLP HTTP (LAN LB) | `http://192.168.0.219:4318` |
| Prometheus scrape | `:8889/metrics` (ServiceMonitor → kube-prometheus-stack) |

## Current producers

- **RustFS** (pi7cl): `RUSTFS_OBS_ENDPOINT=http://192.168.0.219:4318` (Ansible `henryhst.k3s.rustfs`). No native RustFS `/metrics` — see [RustFS Observability](https://docs.rustfs.com/en/operations/observability).

## Pipeline

```text
OTLP HTTP :4318 → batch → prometheus exporter :8889 → ServiceMonitor scrape → Prometheus
traces/logs → nop (unused)
```

## Collector vs Prometheus native OTLP

Prometheus 3.x on nXk3 (`kube-prometheus-stack`, app ~v3.15) can ingest OTLP natively (`enableOTLPReceiver: true` → `/api/v1/otlp/v1/metrics` on the Prometheus HTTP port).

| Path | Use when |
|------|----------|
| **This collector** (LB `.219`) | Host/LAN producers (RustFS), need buffering/batch, keep Prom off the LAN edge |
| **Prometheus native OTLP** | In-cluster apps that can reach `monitoring` (NetworkPolicy: `:9090` only from `monitoring` / `traefik` / `kromgo`) |
| **Scrape** (ServiceMonitor / `additionalScrapeConfigs`) | Default for cluster and static exporters |

Do **not** remove this collector to “use native OTLP only” for RustFS — you lose the LB edge, isolation from the Prometheus pod, and a place for future auth/filter. Prefer dual-path: collector for edge, native OTLP optional in-cluster.

UTF-8 names are default in Prometheus 3.x; leave OTLP name normalization as Prometheus defaults (avoid `NoTranslation` until dashboards are ready).

## References

- Upstream: [Using Prometheus as an OpenTelemetry backend](https://prometheus.io/docs/guides/opentelemetry/)
- Context: Prometheus 3.0 native OTLP (Collector still useful as gateway)
- minilab ADR-0036 (RustFS backup / OTLP follow-up)
- Infra_LAB BookStack: K3s → Observability & Betrieb
