---
book: Newt
book_version: "1.0.0"
chapter: trivy-config-audit
chapter_version: "1.0.0"
updated: "2026-10-28"
---

# Trivy ConfigAudit

> **Buch** v1.0.0 · **Kapitel** v1.0.0 · Stand: 2026-10-28

Config-Audit gegen ReplicaSet `newt-newt-main-tunnel-*` (Trivy Operator). Stand nach Härtung **2026-10-28** in [`values.yaml`](../../../../apps/ops/newt/values.yaml).

## Ist-Härtung

| Ebene | Einstellung |
|-------|-------------|
| Pod SC | `runAsNonRoot`, `runAsUser`/`runAsGroup` **65534** |
| Container SC | wie oben + `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem`, `capabilities.drop: [ALL]`, `seccompProfile.type: RuntimeDefault` |
| Pod-Annotation | `container.seccomp.security.alpha.kubernetes.io/pod: runtime/default` |
| SA | `automountServiceAccountToken: false` |

### Chart-Schema-Falle

Chart `fossorial/newt` 1.5.0: `global.podSecurityContext` erlaubt im Values-Schema nur **Skalare** (`additionalProperties: string|integer|boolean`). Nested `seccompProfile: { type: … }` unter Pod-SC → Helm/Argo **ComparisonError**.

Deshalb: Seccomp am **Container**-`securityContext` (Schema `type: object`) und zusätzlich als Pod-Annotation.

## Findings

| ID | Severity | Status | Hinweis |
|----|----------|--------|---------|
| AVD-KSV-0118 | HIGH | **behoben** | Pod-SC war leer; Scanner behandelte das wie „default SC“ trotz Container-Härtung (bekanntes Trivy-Rauschen) |
| AVD-KSV-0104 | MEDIUM | **behoben** | Seccomp fehlte |
| AVD-KSV-0030 | LOW | **behoben** | `RuntimeDefault` fehlte |
| AVD-KSV-0021 | LOW | **behoben** | `runAsGroup` fehlte (nur UID 65534) |
| AVD-KSV-0125 | MEDIUM | **akzeptiert** | Image von `docker.io` — Lab pinnt Upstream-Tag; Mirror auf Forgejo/registry erst bei Registry-Policy für Newt |

Erwartung nach Sync: ConfigAuditReport des aktuellen RS → **0 HIGH / 0 LOW**, **1 MEDIUM** (`0125`).

```bash
kubectl -n newt get configauditreports -o wide
kubectl -n newt get configauditreports -o json \
  | jq -r '.items[] | select(.metadata.name|startswith("replicaset-newt")) |
    "\(.metadata.name)\tcrit=\(.report.summary.criticalCount) high=\(.report.summary.highCount) med=\(.report.summary.mediumCount) low=\(.report.summary.lowCount)"'
```

Plattform-Kontext: Buch **trivy-operator** → [Betrieb und Metrics](../trivy-operator/04-betrieb-metrics.md).
