# ADR-0037: Pod-Client-Zertifikate (CSI / Step-CA) zurückstellen

- **Status:** Accepted
- **Datum:** 2026-10-23
- **Kontext:** Bewertung [Hardill: Creating Client Certificates for Kubernetes Pods](https://blog.hardill.me.uk/2026/09/24/creating-client-certificates-for-kubernetes-pods/); Companion [ADR-0008](0008-cert-manager-hetzner-dns01.md), [ADR-0030](0030-cloudnative-pg.md)

## Kontext

Kurzlebige **Client**-Zertifikate für Pods (mTLS) lassen sich mit cert-manager-csi-driver und einer privaten CA (z. B. Small Step + StepClusterIssuer) ohne manuelle Secret-Rotation mounten. minilab hat bereits cert-manager für **Server**-TLS (Let’s Encrypt DNS-01) und CNPG-Hybrid-TLS (Server via cert-manager; Client/Replication Operator-managed). Es gibt keinen Small-Step-CA-/CSI-Stack und keinen App-Flow, der Pod→Service-mTLS mit Client-Cert verlangt (typisch: Server-TLS + OIDC/LDAP/App-Auth).

## Entscheidung

- **Jetzt nicht** einführen: Step-CA, step-issuer, cert-manager-csi-driver, ClusterIssuer für Client-Auth.
- Server-TLS und CNPG-Muster bleiben unverändert ([ADR-0008](0008-cert-manager-hetzner-dns01.md), [ADR-0030](0030-cloudnative-pg.md)).
- Revisit nur bei **konkretem Consumer** (ein Service verlangt Client-Cert / mTLS); dann schmal nur für diese App, nicht cluster-weites Default.
- Upstream **Pod Certificates** (Kubernetes ≥ 1.37) bei Bedarf mitbewerten, bevor ein großer Eigenbau startet.

## Konsequenzen

- Kein zusätzlicher Ops-Ballast ohne Nutzen.
- Kein Konflikt mit bestehenden Ingress-/CNPG-Zertifikatspfaden.
- Follow-up: bei erstem mTLS-Consumer dieses ADR superseden oder ergänzen.
