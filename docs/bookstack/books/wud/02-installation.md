---
title: Installation
book_version: "1.0.0"
---

# Installation

Die Reihenfolge ist wichtig: erst Secrets und Authentik, dann Argo CD. Ohne Secret `wud-env` bleibt der Pod in `CreateContainerConfigError`.

## 1. Secrets setzen (Infra_LAB)

```bash
cd ansible/playbooks/k3s_cluster/secrets
secretspec set WUD_OAUTH_CLIENT_SECRET --profile cluster --provider cluster_age
secretspec set MOSQUITTO_WUD_PASSWORD --profile cluster --provider cluster_age
secretspec set WUD_PUSHOVER_APP_TOKEN --profile cluster --provider cluster_age
secretspec check --profile cluster
```

| SecretSpec-Key | Wofür | Gegenstück |
|--|--|--|
| `WUD_OAUTH_CLIENT_SECRET` | OIDC-Client `wupd` | Terraform `wupd_oauth_client_secret` |
| `MOSQUITTO_WUD_PASSWORD` | MQTT-Login `mqtt-wud` | Terraform `mqtt_wud_password` |
| `WUD_PUSHOVER_APP_TOKEN` | eigene Pushover-App „WUD“ | — |
| `GATUS_PUSHOVER_USER_KEY` | Pushover-User (geteilt mit Gatus) | — |
| `REGISTRY_PASSWORD` | Registry-User `registry` (geteilt) | — |

Client-Secret und MQTT-Passwort müssen in `terraform/authentik/dev.secrets.tfvars` denselben Wert haben.

Das Pushover-Token legst du unter https://pushover.net/apps/build an (Name `WUD`, Icon optional).

## 2. Authentik (Terraform)

```bash
cd terraform/authentik
tofu plan -var-file=dev.tfvars -var-file=dev.secrets.tfvars
tofu apply -var-file=dev.tfvars -var-file=dev.secrets.tfvars
```

Das legt an oder ändert:

- Provider/App `wupd` mit Redirect `https://wupd.stadthagen.dev/auth/oidc/authentik/cb` (strict)
- Gruppen `wupd_admins` und `wupd_users` mit Policy-Bindings; `henry` ist in `wupd_admins`
- Service-Account `mqtt-wud` in Gruppe `mqtt_users` (LDAP-Bind für Mosquitto)

## 3. Kubernetes-Secret erzeugen

```bash
cd ansible/playbooks/k3s_cluster
ansible-playbook site.yaml --tags secrets
```

Ergebnis: Secret `wud/wud-env`. Die Keys heißen wie die WUD-Variablen und werden per `envFrom` geladen:

| Key | Quelle |
|--|--|
| `WUD_AUTH_OIDC_AUTHENTIK_CLIENTSECRET` | `WUD_OAUTH_CLIENT_SECRET` |
| `WUD_TRIGGER_PUSHOVER_NXK3_TOKEN` | `WUD_PUSHOVER_APP_TOKEN` |
| `WUD_TRIGGER_PUSHOVER_NXK3_USER` | `GATUS_PUSHOVER_USER_KEY` |
| `WUD_TRIGGER_MQTT_MOSQUITTO_PASSWORD` | `MOSQUITTO_WUD_PASSWORD` |
| `WUD_REGISTRY_CUSTOM_NXK3_PASSWORD` | `REGISTRY_PASSWORD` |

Fehlt ein Wert, lässt Ansible den Key weg. WUD startet trotzdem, nur der betroffene Trigger fehlt.

## 4. DNS und Argo CD

- DNS: `wupd.stadthagen.dev` → Traefik (wie die anderen internen Hosts)
- minilab pushen; Argo CD legt die App `wud` aus dem ApplicationSet `ops` an

```bash
kubectl -n argocd get application wud
kubectl -n wud get pods,pvc,certificate
```

## 5. Prüfen

- https://wupd.stadthagen.dev leitet zu Authentik; nach dem Login ist `henry` Admin
- Die Container-Liste zeigt Workloads aus allen Namespaces
- Prometheus-Target `wud/wud` ist `up`
- Gatus-Endpoint `wud` ist grün
