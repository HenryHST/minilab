# BookStack docs import

Cluster-seitiger Import von Markdown-Büchern (`docs/bookstack/books/`) nach BookStack. **Kein GitHub Actions.**

## Komponenten

| Datei | Zweck |
|-------|--------|
| `import_books.py` | REST-Upsert (Shelves/Books/Pages/Covers); SemVer-Gate via `--state-file` / `--state-prefix` |
| `generate_covers.py` | Erzeugt `cover.png` (880×500) je Buch — lokal, Pillow |
| `gitops-bootstrap.php` | Idempotent: Rolle **GitOps Import**, User `gitops-import@localhost`, API-Token `docs-import` |
| `gitops-bootstrap.sh` | `kubectl exec` → `artisan tinker` im BookStack-Pod |
| `requirements.txt` | PyYAML (lokal / CronJob) |

Deploy & Sources: **minilab** `apps/dev/bookstack/docs-import-*.yaml`.

## Ablauf (Cluster)

1. SecretSpec `BOOKSTACK_API_TOKEN_ID` / `BOOKSTACK_API_TOKEN_SECRET` → K8s Secret `bookstack-import`
2. CronJob / PostSync: `gitops-bootstrap.sh` (Rolle/User/Token upsert)
3. `docs-import-run.sh`: Git-Sources clonen → `import_books.py` → State-CM patchen

## Lokal

```bash
export BOOKSTACK_URL=https://book.stadthagen.dev
export BOOKSTACK_TOKEN_ID=… BOOKSTACK_TOKEN_SECRET=…
pip install -r requirements.txt
python3 import_books.py --books-dir ../../docs/bookstack/books --dry-run
```

Ausführliche Doku: [`docs/bookstack/IMPORT.md`](../../docs/bookstack/IMPORT.md).
