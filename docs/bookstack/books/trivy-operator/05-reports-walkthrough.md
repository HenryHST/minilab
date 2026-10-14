---
title: Reports Walkthrough
book: trivy-operator
book_version: "1.2.1"
chapter: reports-walkthrough
chapter_version: "1.0.0"
updated: "2026-10-12"
---

# Reports Walkthrough

> **Buch** v1.2.1 · **Kapitel** v1.0.0 · Stand: 2026-10-12

Praktischer Lab-Durchlauf: wie der Trivy Operator Image-, Config-, Secret- und RBAC-Findings als Kubernetes-native Reports schreibt. Deploy läuft bereits via Argo — siehe [Deploy und Verify](03-deploy-verify.md).

## Control Loop

```text
Workload / Resource existiert
        ↓
Trivy Operator erkennt sie
        ↓
Trivy Scan-Job läuft
        ↓
Report-CRD wird geschrieben
        ↓
kubectl / Grafana / Scripts lesen den Report
```

Scan-Ergebnisse sind keine losen JSON-Dateien, sondern Custom Resources in der API — abfragbar wie andere Cluster-Objekte.

## Report-Typen

| Report | Frage | Nutzen |
|--------|--------|--------|
| VulnerabilityReport | Welche CVEs stecken im Image? | Patchen / Inventar |
| ConfigAuditReport | Ist der Workload sicher konfiguriert? | Hardening |
| ExposedSecretReport | Sind Secrets im Klartext sichtbar? | Credential-Leak |
| RbacAssessmentReport | Sind RBAC-Rechte riskant? | Privilege / Blast Radius |
| InfraAssessmentReport | Infrastruktur-Findings? | Node-/Cluster-Kontext |
| ClusterComplianceReport | Mapping auf Compliance-Controls? | Audit / Benchmarks |

Vulnerability und ConfigAudit beantworten die zwei häufigsten Fragen: *Was steckt im Image?* vs. *Wie lässt Kubernetes es laufen?*

## Lab-Hinweis

In diesem Cluster sind `kube-system` und `trivy-system` über `excludeNamespaces` ausgenommen (siehe [Architektur](02-architektur.md)). Demo und Findings gehören in App-Namespaces (z. B. `default`). Policy: `ignoreUnfixed: true`, Chart 0.37.0 — ADR-0031.

## Demo-Workload

Absichtlich veraltetes Image plus schwacher `securityContext` — erzeugt Vulnerability- und ConfigAudit-Reports, ohne Trivy manuell aufzurufen.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trivy-demo-nginx
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: trivy-demo-nginx
  template:
    metadata:
      labels:
        app: trivy-demo-nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.16
          securityContext:
            allowPrivilegeEscalation: true
            runAsNonRoot: false
```

```bash
kubectl apply -f trivy-demo-nginx.yaml
kubectl rollout status deployment/trivy-demo-nginx --timeout=120s

DEMO_RS=$(kubectl get replicaset \
  --namespace default \
  --selector app=trivy-demo-nginx \
  -o jsonpath='{.items[0].metadata.name}')
printf 'ReplicaSet: %s\n' "$DEMO_RS"
```

Der Trigger ist Cluster-State, kein CLI-Scan. Bei Verzögerung:

```bash
kubectl get pods -n trivy-system
kubectl logs -n trivy-system deploy/trivy-operator --tail=50
kubectl get jobs -A | grep trivy
```

## Reports prüfen

```bash
kubectl get vulnerabilityreports \
  --all-namespaces \
  --selector "trivy-operator.resource.name=${DEMO_RS}"

kubectl get configauditreports \
  --all-namespaces \
  --selector "trivy-operator.resource.name=${DEMO_RS}"
```

Naming: VulnerabilityReport oft `replicaset-…-nginx` (Image/Container), ConfigAuditReport am Workload-Objekt (`replicaset-…`).

Kurz beschreiben bzw. ein Finding als JSON:

```bash
kubectl describe vulnerabilityreports -n default \
  --selector "trivy-operator.resource.name=${DEMO_RS}"

kubectl get vulnerabilityreports -n default \
  --selector "trivy-operator.resource.name=${DEMO_RS},trivy-operator.container.name=nginx" \
  -o json | jq '.items[0].report.vulnerabilities[0] | {
    vulnerabilityID, resource, installedVersion, fixedVersion, severity, title, primaryLink
  }'
```

Übersicht Critical/High clusterweit (nur Namespaces im Scope):

```bash
kubectl get vulnerabilityreports -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{" critical="}{.report.summary.criticalCount}{" high="}{.report.summary.highCount}{"\n"}{end}'
```

## Lebenszyklus

- Reports spiegeln **aktuellen State**, keine unveränderliche Audit-History. Scanner-Report-TTL default ~24 h — abgelaufene Reports werden gelöscht und neu erzeugt.
- Reports sind Owner der gescannten Resource; GC entfernt sie mit dem ReplicaSet.
- Durable History braucht Export außerhalb des Clusters.

Cleanup:

```bash
kubectl delete -f trivy-demo-nginx.yaml

kubectl get vulnerabilityreports,configauditreports \
  --namespace default \
  --selector "trivy-operator.resource.name=${DEMO_RS}"
```

Operator installiert lassen, wenn weiter gescannt wird. Helm-/Argo-Deinstall entfernt die CRDs nicht automatisch — CRDs blind löschen würde alle Reports mitlöschen (siehe [Betrieb und Metrics](04-betrieb-metrics.md)).
