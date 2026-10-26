---
title: Incident 2026-10-26 Redis→Valkey
book_version: "1.4.0"
chapter: incident-2026-10-26-redis-valkey
chapter_version: "1.0.0"
updated: "2026-10-26"
---

# Incident 2026-10-26: Authentik Valkey STS

> **Buch** v1.4.0 · **Kapitel** v1.0.0 · Stand: 2026-10-26

Fehleranalyse zum Cutover des **dedizierten** Brokers `authentik-redis` (StatefulSet, Redis-Protokoll) auf `valkey/valkey:9.1.2-alpine`. Shared Broker und Paperless-Fokus: Buch **Paperless** → Incident 2026-10-26.

## Überblick

| | |
|--|--|
| **Symptom** | `authentik-redis-1` CrashLoopBackOff; STS Ready 1/2 |
| **Root Cause** | Valkey 9.1 lädt Redis-8-AOF/RDB (**format v15**) nicht; OrderedReady blockiert Primary-Update |
| **Impact** | Task-Broker / Cache / Sessions während Cutover; Login spürbar langsam ohne Broker |
| **Sofortfix** | Argo pause → STS scale 0 → beide `data-authentik-redis-*` wipen → scale 2 |
| **Dauerhaft** | README Cutover-Hinweis; Image/entrypoint `valkey-server` / `valkey-cli` |

`AUTHENTIK_REDIS__HOST=authentik-redis.authentik.svc.cluster.local` unverändert.

## Architektur (Fehler- vs. Sollpfad)

![Redis→Valkey Cutover Architektur](../../../diagrams/archify/exports/redis-valkey-cutover-incident.png)

Explorer: [`redis-valkey-cutover-incident.html`](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/redis-valkey-cutover-incident.html) · Spec: `docs/diagrams/archify/redis-valkey-cutover-incident.json`

## Diagnose-Ablauf

![Redis→Valkey Diagnose](../../../diagrams/archify/exports/redis-valkey-cutover-diagnose.png)

Explorer: [`redis-valkey-cutover-diagnose.html`](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/redis-valkey-cutover-diagnose.html) · Spec: `docs/diagrams/archify/redis-valkey-cutover-diagnose.json`

## Symptom & Checks

```bash
kubectl -n authentik get sts,pods -l app.kubernetes.io/component=redis -o wide
kubectl -n authentik logs authentik-redis-1 --tail=40
kubectl -n authentik get pod authentik-redis-0 \
  -o jsonpath='{.spec.containers[0].image}{"\n"}'
```

**Befund:**

| Check | Ergebnis |
|-------|----------|
| `-1` Log | `Can't handle RDB format version 15` / `AOF loading aborted` |
| `-0` während Rollout | noch `redis:8-alpine3.23` |
| STS | `currentRevision` ≠ `updateRevision`, `readyReplicas=1` |
| Client-Service | weiterhin nur Pod-Index `0` |

## Hypothesen (STS)

| ID | Hypothese | Status |
|----|-----------|--------|
| B | RDB/AOF v15 inkompatibel mit Valkey 9.1 | **bestätigt** |
| C | OrderedReady bleibt bei Replica-Crash stecken | **bestätigt** |
| D | Image-Pull | verworfen |
| E | Probe `valkey-cli` | verworfen |

Shared-Parallel (`FailedAttachVolume` / Recreate): siehe Paperless-Incident.

## Sofortfix

```bash
kubectl -n argocd patch application authentik --type json \
  -p '[{"op":"replace","path":"/spec/syncPolicy","value":{}}]'

kubectl -n authentik scale sts/authentik-redis --replicas=0
# Wipe-Jobs auf PVC data-authentik-redis-0 und data-authentik-redis-1
kubectl apply -f apps/ops/authentik/redis.yaml
kubectl -n authentik scale sts/authentik-redis --replicas=2
kubectl -n authentik rollout status sts/authentik-redis --timeout=240s
```

### Replication-Smoke

```bash
kubectl -n authentik exec authentik-redis-0 -- valkey-cli ping
kubectl -n authentik exec authentik-redis-0 -- valkey-cli info replication \
  | rg 'role|connected_slaves'
kubectl -n authentik exec authentik-redis-1 -- valkey-cli info replication \
  | rg 'role|master_host|master_link_status'
# Erwartung: master + connected_slaves:1; slave + master_link_status:up
```

Optional: `kubectl -n authentik delete pod authentik-redis-1` und Rejoin prüfen. Danach Argo automated sync wieder aktivieren.

## Lessons Learned

- Authentik-Broker-Daten sind Cache/Sessions — Wipe beim Engine-Wechsel ist akzeptabel.
- STS `OrderedReady` + inkompatible Replica-Daten = Rollout-Deadlock.
- Shared Redis (`apps/infra/redis`) nicht wieder für Authentik nutzen; dediziertes STS bleibt.

## Quellen

| Ressource | Pfad |
|-----------|------|
| Manifest | `apps/ops/authentik/redis.yaml` |
| README Valkey | `apps/ops/authentik/README.md` |
| Deploy & Verify | [03-deploy-verify](03-deploy-verify.md) |
| Paperless (Shared) | Buch Paperless → Incident 2026-10-26 |
| Archify | `docs/diagrams/archify/redis-valkey-cutover-*` |
