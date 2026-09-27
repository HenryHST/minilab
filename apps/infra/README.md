# apps/infra

Platform storage, cluster timezone, and Traefik error / maintenance pages.

| App | Sync wave | Namespace |
|-----|-----------|-----------|
| longhorn | 1 | longhorn-system |
| k8tz | 1 | k8tz |
| error-pages | 1 | error-pages |

Managed by ApplicationSet `infra` / AppProject `infra`. See [ADR-0022](../../docs/adr/0022-apps-bucket-applicationsets.md) and [ADR-0024](../../docs/adr/0024-error-pages.md).
