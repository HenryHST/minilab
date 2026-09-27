# Deploy & Verify

## Deploy

Values: `apps/infra/nfd/values.yaml`. ApplicationSet-Eintrag in `apps/argocd-apps/raw/applicationset-infra.yaml`.

```bash
kubectl -n argocd get application nfd
kubectl -n node-feature-discovery get pods,podmonitor
```

## Feature-Labels prüfen

```bash
kubectl get nodes -o json | jq -r '
  .items[] | .metadata.name as $n |
  (.metadata.labels // {}) | to_entries[] |
  select(.key | startswith("feature.node.kubernetes.io")) |
  "\($n)\t\(.key)=\(.value)"
' | head -40
```

Erwartung: Labels auf **allen** Nodes inkl. control-plane (Worker-Toleration `operator: Exists`).
