---
title: Fehlersuche LDAP
book_version: "1.3.0"
---

# Fehlersuche LDAP (`ldap-preflight`)

Wenn der Broker nicht Ready wird, zuerst den Init-Container prüfen — nicht den Exporter oder Smoke-Jobs.

```bash
kubectl -n mosquitto get pods
kubectl -n mosquitto logs deploy/mosquitto -c ldap-preflight
```

![Mosquitto LDAP-Fehlersuche](https://raw.githubusercontent.com/HenryHST/minilab/main/docs/diagrams/seecode/exports/mosquitto-ldap-fehlersuche.png)

Explorer: [mosquitto-ldap-fehlersuche.html](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/seecode/mosquitto-ldap-fehlersuche.html)

## Symptom → typische Folge

| Symptom | Oft sekundär |
|---------|----------------|
| `mosquitto` `Init:Error` / `CrashLoopBackOff` auf `ldap-preflight` | Exporter: `dial …:1883: no route to host` |
| Preflight meldet Whitespace / invalid credentials | Smoke/CronJob Failed, MQTT `not authorised` |
| Broker **Ready**, aber `mqtt-smoke` `BackoffLimitExceeded` / `Error: The connection was lost` und Broker-Log `LDAP superuser search error: … ldap: connection closed` | Exporter/`mqtt-tools` Auth flaky; TCP zum LDAP-Outpost kann trotzdem offen sein |

Ohne laufenden Broker sind Exporter und Smoke **Folgeschäden**.

### Runtime: go-auth LDAP-Session tot (Broker bleibt Ready)

Init `ldap-preflight` prüft den Bind nur beim Start. Danach kann Authentik den LDAP-Outpost-Session schließen; go-auth nutzt dann eine tote Verbindung. Symptom: viele `LDAP superuser search error` / `ldap: connection closed`, Smoke-Pods `connection was lost`, Job `BackoffLimitExceeded` — während `nc …:389` aus dem Namespace weiter `open` meldet.

```bash
kubectl -n mosquitto logs deploy/mosquitto -c mosquitto --since=2m | grep -c 'LDAP superuser search error'
kubectl -n mosquitto rollout restart deploy/mosquitto
kubectl -n mosquitto rollout status deploy/mosquitto
kubectl -n mosquitto create job --from=cronjob/mqtt-smoke "mqtt-smoke-check-$(date +%H%M%S)"
```

Erwartung nach Restart: Preflight wieder `LDAP simple bind succeeded`, LDAP-Fehler-Zähler ~0, Smoke-Job `Complete`.

## Preflight-Meldungen

| Log (Auszug) | Ursache | Nächster Schritt |
|--------------|---------|------------------|
| `LDAP bind password has leading or trailing whitespace` | Passwort in gerendertem Conf / Secret mit Space/Newline | Secret `mosquitto-ldap` prüfen (siehe unten) |
| `invalid credentials` / LDAP result 49 | Bind-Passwort ≠ Authentik `ldapservice` | SecretSpec `MOSQUITTO_LDAP_BIND_PASSWORD` = TF `ldapservice_password` (exakt) |
| `not accepting LDAP connections` | Outpost down / kein TCP :389 | `kubectl -n authentik logs deploy/ak-outpost-ldap-stadthagen-outpost` |
| `LDAP simple bind succeeded` | OK | Broker sollte starten |

## Safe Checks am Secret (kein Passwort dump)

Nur Flags/Längen — **nie** den Klartext loggen:

```bash
kubectl -n mosquitto get secret mosquitto-ldap -o jsonpath='{.data.00-bind\.conf}' | base64 -d | python3 -c '
import sys
for line in sys.stdin:
  if line.startswith("auth_opt_ldap_bind_password "):
    pw = line[len("auth_opt_ldap_bind_password "):].rstrip("\n")
    print("pw_len", len(pw))
    print("trail_ws", bool(pw) and pw[-1].isspace())
    print("has_at", "@" in pw)
    print("has_pct40", "%40" in pw)
'
```

Erwartung nach korrektem Apply: `trail_ws False`, `has_at True` (falls das Passwort `@` enthält), `has_pct40 False`.

## Incident 2026-10-12

1. Cluster: viele `Init:Error` / Unknown-Pods; Exporter CrashLoop.
2. Preflight: **Whitespace** im Bind-Passwort.
3. Secret-Analyse: Trailing-Space **und** `@` als **`%40`** (URL-encoded) — SecretSpec war bereits clean (kein Whitespace, literales `@`).
4. Root Cause: Ansible `k3s_secrets` template `secret.j2` encodete Format-Werte per Default mit `urlencode`.
5. Fix (Infra_LAB):
   - `mosquitto-ldap`: `format_encode: none`
   - `| trim` auf Spec-Werte in `secret.j2`
6. Secret neu aus SecretSpec; Pod neu → `LDAP simple bind succeeded` → Broker + Exporter `1/1`.

Dauerhaft: nach Secret-Änderungen `ansible-playbook … --tags secrets`, dann ggf. `kubectl -n mosquitto delete pod -l app=mosquitto`.

## Verwandte Doku

- Deploy: Kapitel *Deploy & Verify*
- App-README Startup: [`apps/infra/mosquitto/README.md`](../../../../apps/infra/mosquitto/README.md)
- Infra_LAB Secrets: `ansible/playbooks/k3s_cluster/secrets/README.md` (`MOSQUITTO_LDAP_BIND_PASSWORD`)
