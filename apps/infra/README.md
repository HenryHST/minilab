# apps/infra

Platform storage, cluster timezone, node feature labels, shared Redis, Mosquitto MQTT, and Traefik error / maintenance pages.

| App | Sync wave | Namespace |
|-----|-----------|-----------|
| longhorn | 1 | longhorn-system |
| k8tz | 1 | k8tz |
| nfd | 1 | node-feature-discovery |
| redis | 1 | redis |
| mosquitto | 1 | mosquitto |
| error-pages | 1 | error-pages |

Managed by ApplicationSet `infra` / AppProject `infra`. See [ADR-0022](../../docs/adr/0022-apps-bucket-applicationsets.md), [ADR-0024](../../docs/adr/0024-error-pages.md), [ADR-0025](../../docs/adr/0025-nfd.md), [ADR-0026](../../docs/adr/0026-paperless-ngx.md), and [ADR-0029](../../docs/adr/0029-mosquitto.md).
