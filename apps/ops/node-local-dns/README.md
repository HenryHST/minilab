# NodeLocal DNSCache (Cilium LRP)

Per-node DNS cache for nXk3. Pods keep `nameserver 10.43.0.10` (`kube-dns`); Cilium **LocalRedirectPolicy** steers that traffic to the local `node-local-dns` DaemonSet. Cache misses go to CoreDNS via `kube-dns-upstream` (avoids an LRP loop).

Not the Medium/iptables + `hostNetwork` recipe — that path does not work with Cilium kube-proxy replacement.

## Prerequisites

1. Cilium Helm: `localRedirectPolicy: true` (Infra_LAB `cni_cilium` values; Ansible `--tags cilium`).
2. Argo app `node-local-dns` synced (this directory).

## Layout

| Resource | Role |
|----------|------|
| DaemonSet `node-local-dns` | Cache agent (`registry.k8s.io/dns/k8s-dns-node-cache`) |
| Service `kube-dns-upstream` | Selector → real CoreDNS pods |
| `CiliumLocalRedirectPolicy/nodelocaldns` | `kube-dns` → local cache |
| ServiceMonitor | Metrics `:9253` |

## NetworkPolicies

Egress that only allows `k8s-app=kube-dns` can break DNS after LRP (traffic lands on `k8s-app=node-local-dns`). Template and apps allow both selectors (`apps/_templates/networkpolicy-app.yaml` and clones).

## Verify

```bash
kubectl -n kube-system get ds,pods -l k8s-app=node-local-dns
kubectl -n kube-system get ciliumlocalredirectpolicy nodelocaldns -o yaml

# On a Cilium agent pod (EnableLocalRedirectPolicy must be true — restart ds/cilium after Helm flip):
kubectl -n kube-system exec -it ds/cilium -- cilium-dbg config get EnableLocalRedirectPolicy
kubectl -n kube-system exec -it ds/cilium -- cilium-dbg lrp list
# Expect Frontend 10.43.0.10:53/UDP|TCP → node-local-dns on this node

kubectl -n kube-system exec -it ds/cilium -- cilium-dbg service list | grep LocalRedirect

# Functional DNS
kubectl run dns-test --rm -it --restart=Never --image=busybox:1.36 -- \
  nslookup kubernetes.default.svc.cluster.local

# Cache metrics (pick a node-local-dns pod IP; metrics bind 0.0.0.0:9253)
IP=$(kubectl -n kube-system get pod -l k8s-app=node-local-dns --field-selector=status.phase=Running \
  -o jsonpath='{.items[0].status.podIP}')
kubectl run curl-nld --rm -i --restart=Never --image=curlimages/curl:8.5.0 -- \
  "http://${IP}:9253/metrics" | grep -E 'coredns_cache_hits_total|coredns_dns_requests_total'
```

Verified on nXk3 (2026-10-29): `EnableLocalRedirectPolicy=true`, LRP `nodelocaldns` maps `10.43.0.10:53` → local cache, BookStack/Vaultwarden DNS OK. DaemonSet **12/13** Ready while `pi2cl` is NotReady (stuck Cilium Terminating) — not an NLD config fault.

## Rollback

Delete the Argo app / directory sync (removes LRP + DaemonSet). DNS falls back to CoreDNS via `kube-dns`. Keep CoreDNS running.

## Docs

BookStack: [docs/bookstack/books/node-local-dns](../../../docs/bookstack/books/node-local-dns/). Cilium upstream: [Local Redirect Policy — Node-local DNS](https://docs.cilium.io/en/stable/network/kubernetes/local-redirect-policy/#node-local-dns-cache).
