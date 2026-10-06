---
title: Day-2 & PolicyReports
book_version: "1.0.0"
---

# Day-2 & PolicyReports

### Reports lesen

```bash
kubectl get policyreport -A
kubectl get clusterpolicyreport
kubectl get policyreport -n <ns> -o yaml | less
```

Typische Violations: falsche StorageClass, fehlende Requests, privileged Sidecars, Images von unbekannten Hosts, PVC-Pods ohne `worker=true`.

### Wann Enforce?

Erst wenn Reports über Tage stabil und False-Positives bereinigt sind (Excludes/Opt-out). Dann einzelne Policies von `Audit` auf `Enforce` heben — nicht alle auf einmal.

### Troubleshooting

| Symptom | Check |
|---------|--------|
| Keine Webhooks | `kubectl get validatingwebhookconfiguration \| grep kyverno`; Pods in `kyverno` |
| Argo OutOfSync | ServerSideApply / CRD-Ownership; Application `kyverno` Events |
| Zu viel Noise | Namespace-Excludes erweitern oder `policy.stadthagen.dev/exempt` |
| Admission-Latenz | Replicas/Ressourcen; Webhook-Timeouts in Events |
