# RustFS Console ingress

Traefik front door for the RustFS Console on **pi7cl** (`192.168.0.107:9001`).

- Host: `https://rustfs.stadthagen.dev`
- Backend: EndpointSlice → LAN IP (host Docker, not a cluster pod)
- OIDC: Authentik app `rustfs` (Infra_LAB Terraform); Ansible writes OpenID env on the host

> **Argo CD:** `EndpointSlice` is in `resource.exclusions`, so Git sync will **not** create `endpointslice.yaml`. Apply once after cutover:
> `kubectl apply -f apps/infra/rustfs/endpointslice.yaml`

## DNS

Create an A (and optional AAAA) record for `rustfs.stadthagen.dev` pointing at the Traefik external LB VIP (same as other `*.stadthagen.dev` apps, e.g. `192.168.0.215`).

## S3 API

Longhorn BackupTarget keeps using `http://192.168.0.107:9000` (not published here).
