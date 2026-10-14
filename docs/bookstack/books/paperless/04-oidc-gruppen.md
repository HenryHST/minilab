---
title: OIDC-Gruppen
book_version: "1.2.0"
---

# OIDC-Gruppen

> **Buch** v1.2.0 · Stand: 2026-10-14

Paperless kennt zwei Arten von Authentik-Gruppen: **Zugang** (Policy Binding auf die OAuth-App) und **Dokumentrechte** (OIDC-`groups`-Claim → Django `auth_group`). Dokumentgruppen müssen **vor** dem Login in Paperless existieren — Sync legt sie nicht an, sondern mappt nur Membership.

![Paperless OIDC-Gruppen](https://raw.githubusercontent.com/HenryHST/minilab/main/docs/diagrams/archify/exports/paperless-oidc-groups.png)

Explorer: [paperless-oidc-groups.html](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/paperless-oidc-groups.html)

## Gruppenmatrix

| Authentik-Name | Zweck | Paperless | Mitglieder (Dev) |
|--|--|--|--|
| `paperless_admins` | App-Zugang + Superuser-Sync | Django-Gruppe + `SYNC_SUPERUSER_GROUP` | henry |
| `paperless_users` | App-Zugang | Django-Gruppe + Default | marion, frank, gabi, falko, … |
| `familie_stadthagen` | Dokumentrechte | Django-Gruppe | henry, marion |
| `familie_erdmann` | Dokumentrechte | Django-Gruppe | gabi, frank |
| `vs-nfd` | Dokumentrechte | Django-Gruppe | henry, marion |

falko behält nur `paperless_users` — keine Familiengruppen.

## Ownership (zwei Repos)

| Schritt | Repo / Pfad |
|--|--|
| Authentik-Gruppen + Membership | Infra_LAB `terraform/authentik/modules/dev/authentik_paperless.tf`, `access_control_users.tf` |
| OAuth Secret (`SCOPE` + `fetch_userinfo`) | Infra_LAB `k3s_secrets` → Secret `paperless-oauth` |
| Sync-Flags | minilab `apps/dev/paperless/paperless.yaml` (`PAPERLESS_SOCIAL_ACCOUNT_SYNC_GROUPS=true`, Claim `groups`) |
| Django-Gruppen anlegen | minilab `apps/dev/paperless/inbox-tag-job.yaml` (Argo PostSync, Wave 5) |

## Provisionierung (PostSync)

![Gruppen-Provisionierung](https://raw.githubusercontent.com/HenryHST/minilab/main/docs/diagrams/archify/exports/paperless-groups-provision.png)

Explorer: [paperless-groups-provision.html](https://github.com/HenryHST/minilab/blob/main/docs/diagrams/archify/paperless-groups-provision.html)

Ablauf nach Argo Sync:

1. Hook-Job `paperless-inbox-tag` startet.
2. Wartet auf Paperless-Web-Pod mit **`status.phase=Running`** und Ready.
3. `kubectl exec` → `manage.py shell`: `Group.objects.get_or_create` für Access- und Dokumentgruppen, Permissions setzen.
4. Beim nächsten OIDC-Login mappt Paperless den `groups`-Claim auf diese Django-Gruppen.

### Fallstrick: Completed Pods

`kubectl get pod -l app=paperless -o jsonpath='{.items[0]…}'` **ohne** `--field-selector=status.phase=Running` trifft oft auf alte Completed/Error-Pods. Dann: `cannot exec into a container in a completed pod` — Gruppen bleiben aus. Fix: immer Running filtern (wie Backup-CronJobs).

## Verify

```bash
# Django-Gruppen
WEB=$(kubectl -n paperless get pod -l app=paperless --field-selector=status.phase=Running \
  -o jsonpath='{.items[0].metadata.name}')
kubectl -n paperless exec "$WEB" -c paperless -- \
  python3 manage.py shell -c "from django.contrib.auth.models import Group; print(sorted(g.name for g in Group.objects.all()))"

# PostSync-Job
kubectl -n paperless get job paperless-inbox-tag
kubectl -n paperless logs job/paperless-inbox-tag --tail=50
```

Erwartete Namen u. a.: `paperless_admins`, `paperless_users`, `familie_stadthagen`, `familie_erdmann`, `vs-nfd`.

UI: Settings → Users → Groups. Nach Membership-Änderung in Authentik einmal neu per OIDC einloggen.
