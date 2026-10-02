---
title: Betrieb und Metrics
book_version: "1.0.0"
---

# Betrieb und Metrics

## Policy

- `ignoreUnfixed: true` — Noise ohne Fix reduzieren.
- Exclude nur System-Namespaces; App-Namespaces bleiben im Scope.

## Metrics

Operator-Metriken über ServiceMonitor. Targets in Prometheus prüfen (`serviceMonitor` Label `release: kube-prometheus-stack`). Alerts sind in v1 nicht vordefiniert — bei Bedarf Rules analog `homelab-alerts` ergänzen.

## Pflege

- Chart-Pin in ApplicationSet bumpen (SemVer).
- CRDs bei Deinstall **nicht** blind löschen — löscht alle Reports (siehe Upstream Helm-Docs).
- Private Registry / imagePullSecrets später, falls Scanner private Images braucht.
