# apps/infra

Platform storage, cluster timezone, node feature labels, and Traefik error / maintenance pages.

| App | Sync wave | Namespace |
|-----|-----------|-----------|
| longhorn | 1 | longhorn-system |
| k8tz | 1 | k8tz |
| nfd | 1 | node-feature-discovery |
| error-pages | 1 | error-pages |

Managed by ApplicationSet `infra` / AppProject `infra`. See [ADR-0022](../../docs/adr/0022-apps-bucket-applicationsets.md), [ADR-0024](../../docs/adr/0024-error-pages.md), and [ADR-0025](../../docs/adr/0025-nfd.md).
