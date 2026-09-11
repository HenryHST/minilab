# ADR-0008: TLS via cert-manager und Hetzner DNS-01

- **Status:** Accepted
- **Datum:** 2026-09-11
- **Kontext:** `infra/cert-manager/`, App-`certificate.yaml`

## Kontext

Traefik IngressRoutes brauchen TLS. Manuelles Kopieren eines Wildcards (`stadthagen-tls` aus Namespace `traefik`) war fehleranfällig und nicht app-spezifisch rotierbar.

## Entscheidung

- **cert-manager** (Native Helm) mit Webhook **Hetzner DNS-01**.
- ClusterIssuer `letsencrypt-prod`.
- Pro App ein `Certificate`; TLS-Secret heißt `<app>-tls`.
- Secret `hetzner` im Namespace `certmanager` (Ansible Secrets).
- DNS A-Records für interne Traefik-Hosts zeigen auf Traefik LB (`192.168.0.215`).

## Konsequenzen

- Kein manuelles Zertifikat-Kopieren mehr.
- Abhängigkeit: cert-manager + Webhook müssen vor abhängigen Certificates synced sein.
- Öffentliche Pangolin-Hosts terminieren TLS am Pangolin-Edge ([ADR-0011](0011-pangolin-public-exposure.md)), nicht zwingend über denselben Ingress-Pfad.
