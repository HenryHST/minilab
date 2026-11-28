# unifi-sms

UniFi U5G SMS bridge for Authentik (MFA OTP + `login_failed` notify) with a Podcraft-style admin UI.

- Public UI: `https://sms.stadthagen.dev`
- Cluster webhooks: `http://unifi-sms.authentik.svc.cluster.local:8080/v1/{otp,notify}`
- Image: `git.stadthagen.dev/ops/unifi-sms:<semver>` (mirror `registry.stadthagen.dev/ops/unifi-sms`)

## Features

- Send-only SSH → `ubus call uiwwand call send-sms` (64-byte parts)
- Bearer machine API + optional UI (`UNIFI_SMS_UI_ENABLED`)
- Auth: OIDC / Basic / both (Podcraft pattern)
- Dashboard + Logs (`LogRing`, 4s poll)
- Rate limit + daily cap + `+49` prefix allowlist

## Secrets

Infra_LAB Ansible SecretSpec → Secret `unifi-sms` in namespace `authentik`:

| SecretSpec | K8s key |
|------------|---------|
| `UNIFI_SMS_HOST` | `U5G_HOST` |
| `UNIFI_SMS_SSH_USER` | `U5G_USER` |
| `UNIFI_SMS_SSH_PRIVATE_KEY` | `U5G_SSH_PRIVATE_KEY` |
| `UNIFI_SMS_HOST_KEY` | `U5G_HOST_KEY` |
| `UNIFI_SMS_WEBHOOK_TOKEN` | `WEBHOOK_TOKEN` |
| `UNIFI_SMS_OAUTH_CLIENT_SECRET` | `UNIFI_SMS_OIDC_CLIENT_SECRET` |
| `UNIFI_SMS_SESSION_SECRET` | `UNIFI_SMS_SESSION_SECRET` |

Also: `registry-pull` in `authentik`. Pin TF `sms_webhook_token` / `unifi_sms_oauth_client_secret` to the same values.

Manual: enable UniFi Device SSH, add the public key, set modem IP + pinned host key.

### SSH / Secret pitfalls

| Symptom | Cause | Fix |
|---------|--------|-----|
| Blank UI (`#app` empty) | `app.js` SyntaxError (`throw Object status: 401 }`) | Fixed in tree; ConfigMap `unifi-sms-app-js` overlays until next image digest |
| `Missing PEM footer` | `U5G_SSH_PRIVATE_KEY` flattened to one line in the Secret/env | App calls `normalize_pem_key()`; prefer storing real newlines in SecretSpec |
| `Host key is not trusted` | `U5G_HOST_KEY` pin ≠ key the modem presents (e.g. ed25519 pin vs live `ssh-rsa`) | Re-pin with the live key: `ssh-keyscan -t rsa <U5G_HOST>` (or whatever algo the modem offers) → SecretSpec `UNIFI_SMS_HOST_KEY` |
| Authentik `Client ID Error` | OIDC app `unifi-sms` missing in IdP | Apply Terraform `module.unifi_sms_oauth` (`Infra_LAB/terraform/authentik`) |

Temporary ConfigMap overlays (remove after rebuilding/pinning a new image digest):

- `app-js-configmap.yaml` → mount `/app/app/static/js/app.js`
- `code-fix-configmap.yaml` → mount `/app/app/util.py` + `modem.py`

## Local dry-run

```bash
cd apps/ops/unifi-sms
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
export UNIFI_SMS_UI_ENABLED=true UNIFI_SMS_AUTH_MODE=none UNIFI_SMS_DRY_RUN=true
export UNIFI_SMS_SESSION_SECRET=dev WEBHOOK_TOKEN=dev
uvicorn app.main:app --reload --port 8080
```

## API (Podcraft Phase 2)

```http
POST /api/v1/send
Authorization: Bearer <token>
{"to":"+491701234567","message":"hello"}
```

→ `{"ok":true,"parts":1}`

OTP/notify webhooks are **not** exposed on the public HTTPRoute.

## Argo

ApplicationSet `ops` → path `apps/ops/unifi-sms`, namespace `authentik`, sync wave `3`.
Gateway listener `https-sms` + Certificate `sms-tls`.

## Image CI

Sync `.forgejo/workflows/image.yml` into Forgejo repo `ops/unifi-sms`, then pin digest in `deployment.yaml`.

After a digest that includes the `app.js` / PEM fixes, remove the ConfigMap overlays from `deployment.yaml` and delete ConfigMaps `unifi-sms-app-js` / `unifi-sms-code-fix`.
