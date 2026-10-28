---
title: Incident 2026-10-28 — PVC Terminating + LDAP Boot
book_version: "1.4.0"
chapter_version: "1.0.0"
updated: "2026-10-28"
---

# Incident 2026-10-28 — PVC Terminating + LDAP Boot

> **Buch** v1.4.0 · **Kapitel** v1.0.0 · Stand: 2026-10-28

Zwei hintereinander liegende Fehler: zuerst **FailedScheduling** (PVC-Blocker), danach **Init:Error** / Warteschleife in `ldap-preflight` (Secret-Whitespace + LDAP-Outpost).

## Symptom

```text
mosquitto-…: FailedScheduling
0/13 nodes are available: persistentvolumeclaim "mosquitto-data" is being deleted. not found
```

Argo App `mosquitto` **Degraded**; Exporter/Smoke ebenfalls betroffen, solange der Broker fehlt.

## Fehlerkette

![Mosquitto PVC + LDAP Incident](https://raw.githubusercontent.com/HenryHST/minilab/main/docs/diagrams/archify/exports/mosquitto-pvc-ldap-incident.png)

Explorer: [mosquitto-pvc-ldap-incident.html](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/mosquitto-pvc-ldap-incident.html)

| Stufe | Befund | Wirkung |
|-------|--------|---------|
| 1 | PVC `mosquitto-data` **Terminating** seit Stunden | Scheduler lehnt neue Pods ab |
| 2 | Pod **Succeeded** hält Claim (`PodUsingPVC`) | `kubernetes.io/pvc-protection` bleibt |
| 3 | Longhorn-Volume **NotFound** | PVC/PV Finalizer hängt ohne Daten |
| 4 | Nach PVC-Neu: `ldap-preflight` **Whitespace** | Init:Error (Bind-PW mit trailing space) |
| 5 | LDAP-Outpost sticky **API 503** | Port 389 nimmt keine Verbindungen an |

Verwandt (generisch): Infra_LAB K3s-Buch [Zombie-Pods](https://github.com/HenryHST/Infra_LAB/blob/main/docs/bookstack/books/k3s/18-zombie-pods.md) — Klasse `pvc_blocker`.

## Diagnose & Remediation

![Mosquitto Diagnose](https://raw.githubusercontent.com/HenryHST/minilab/main/docs/diagrams/archify/exports/mosquitto-pvc-ldap-diagnose.png)

Explorer: [mosquitto-pvc-ldap-diagnose.html](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/mosquitto-pvc-ldap-diagnose.html)

### A) PVC freigeben

```bash
# Triage
kubectl -n mosquitto get pods,pvc
kubectl -n mosquitto get pvc mosquitto-data -o jsonpath='{.status.conditions}{"\n"}'
kubectl -n longhorn-system get volumes.longhorn.io "$(kubectl -n mosquitto get pvc mosquitto-data -o jsonpath='{.spec.volumeName}')"

# Semi-auto (Infra_LAB)
cd ansible/playbooks/k3s_cluster
ansible-playbook cleanup-zombie-pods.yaml -e apply_cleanup=true -e clear_pvc_finalizers=true -e 'namespaces=["mosquitto"]'

# Manuell (Kurzform)
kubectl -n mosquitto scale deploy/mosquitto --replicas=0
kubectl -n mosquitto delete pod -l app=mosquitto --force --grace-period=0
# wenn PVC noch Terminating und LH NotFound: Finalizer clearen, dann Manifest neu apply
kubectl apply -f apps/infra/mosquitto/mosquitto.yaml
kubectl -n mosquitto scale deploy/mosquitto --replicas=1
```

**Warnung:** Bei `clear_pvc_finalizers` und fehlendem Longhorn-Volume ist Persistenz-Datenverlust möglich (wie Shared-Redis-Incident).

### B) Boot / LDAP

```bash
# Whitespace in 00-bind.conf (Wert nicht loggen) — SecretSpec neu setzen ohne trailing space
# dann: ansible-playbook site.yaml --tags secrets

kubectl -n mosquitto logs deploy/mosquitto -c ldap-preflight --tail=20
kubectl -n authentik logs deploy/ak-outpost-ldap-stadthagen-outpost -c ldap --tail=30

# Outpost nach Authentik-Outage neu starten
kubectl -n authentik rollout restart deploy/ak-outpost-ldap-stadthagen-outpost
kubectl -n mosquitto delete pod -l app=mosquitto
```

Preflight-Texte und Secret-Quellen: [`mosquitto.yaml`](../../../apps/infra/mosquitto/mosquitto.yaml) (`ldap-preflight.sh`), README Auth-Zeile.

## Verify

1. `kubectl -n mosquitto get pods,pvc` → Pod **1/1 Ready**, PVC **Bound**
2. `kubectl -n mosquitto logs deploy/mosquitto -c ldap-preflight` → `LDAP simple bind succeeded`
3. Exporter/Smoke wieder grün (optional: Grafana MQTT-Datasource)

## Lessons

| Thema | Maßnahme |
|-------|----------|
| PVC-Blocker | Weekly Gate + `cleanup-zombie-pods.yaml`; Succeeded/Failed zählen |
| SecretSpec | `MOSQUITTO_LDAP_BIND_PASSWORD` exakt = TF `ldapservice_password`, **kein** Whitespace |
| LDAP-Outpost | Nach längerer Authentik-503/DB-Störung Outpost-Deploy restarten |

## Quellen

| | |
|--|--|
| Manifest | [`apps/infra/mosquitto/`](../../../apps/infra/mosquitto/) |
| Cleanup Playbook | Infra_LAB `cleanup-zombie-pods.yaml` |
| Zombie/PVC Runbook | Infra_LAB [18-zombie-pods.md](https://github.com/HenryHST/Infra_LAB/blob/main/docs/bookstack/books/k3s/18-zombie-pods.md) |
| ADR | [0029-mosquitto](../../../adr/0029-mosquitto.md) |
