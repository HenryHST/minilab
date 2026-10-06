# apps/infra

Platform storage, Kyverno admission (Audit), cluster timezone, node feature labels, shared Redis, Mosquitto MQTT, CloudNativePG operator, and Traefik error / maintenance pages.

| App | Sync wave | Namespace |
|-----|-----------|-----------|
| kyverno | 0 | kyverno |
| longhorn | 1 | longhorn-system |
| k8tz | 1 | k8tz |
| nfd | 1 | node-feature-discovery |
| redis | 1 | redis |
| mosquitto | 1 | mosquitto |
| cloudnative-pg | 1 | cnpg-system |
| error-pages | 1 | error-pages |

Managed by ApplicationSet `infra` / AppProject `infra`. See [ADR-0022](../../docs/adr/0022-apps-bucket-applicationsets.md), [ADR-0024](../../docs/adr/0024-error-pages.md), [ADR-0025](../../docs/adr/0025-nfd.md), [ADR-0026](../../docs/adr/0026-paperless-ngx.md), [ADR-0029](../../docs/adr/0029-mosquitto.md), [ADR-0030](../../docs/adr/0030-cloudnative-pg.md), and [ADR-0032](../../docs/adr/0032-kyverno-admission-audit.md).
