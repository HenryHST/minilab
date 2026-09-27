#!/usr/bin/env python3
"""Idempotent BookStack import from docs/bookstack/books/*/meta.yaml + NN-*.md pages.

Env:
  BOOKSTACK_URL            e.g. https://book.stadthagen.dev
  BOOKSTACK_TOKEN_ID       API token id
  BOOKSTACK_TOKEN_SECRET   API token secret

Usage:
  ./import_books.py [--books-dir PATH] [--dry-run] [--only SLUG]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
except ImportError:
    yaml = None  # minimal fallback parser below


FRONTMATTER_RE = re.compile(r"^---\r?\n.*?\r?\n---\r?\n", re.DOTALL)
H1_RE = re.compile(r"^#\s+(.+)$", re.MULTILINE)
CHAPTER_MD_RE = re.compile(r"^\d{2}-.+\.md$")


def die(msg: str, code: int = 1) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(code)


def load_yaml(text: str) -> dict[str, Any]:
    if yaml is not None:
        data = yaml.safe_load(text) or {}
        if not isinstance(data, dict):
            die("meta.yaml must be a mapping")
        return data
    # Minimal subset: key: value (quoted or plain)
    out: dict[str, Any] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        v = v.strip().strip('"').strip("'")
        out[k.strip()] = v
    return out


def strip_frontmatter(md: str) -> str:
    return FRONTMATTER_RE.sub("", md, count=1).lstrip("\n")


def page_title(md: str, fallback: str) -> str:
    body = strip_frontmatter(md)
    m = H1_RE.search(body)
    if m:
        return m.group(1).strip()
    return fallback


class BookStackClient:
    def __init__(self, base: str, token_id: str, token_secret: str, dry_run: bool = False):
        self.base = base.rstrip("/")
        self.auth = f"Token {token_id}:{token_secret}"
        self.dry_run = dry_run

    def _req(self, method: str, path: str, body: dict | None = None) -> Any:
        url = f"{self.base}{path}"
        data = None
        headers = {
            "Authorization": self.auth,
            "Accept": "application/json",
        }
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        if self.dry_run and method in ("POST", "PUT", "DELETE"):
            print(f"DRY-RUN {method} {path} {json.dumps(body or {}, ensure_ascii=False)[:200]}")
            fake = {"id": 0, "data": [], "dry_run": True}
            if isinstance(body, dict):
                fake.update({k: body[k] for k in ("name", "description", "books") if k in body})
            return fake
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read().decode()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            err = e.read().decode(errors="replace")
            die(f"{method} {path} -> HTTP {e.code}: {err[:500]}")
        except urllib.error.URLError as e:
            die(f"{method} {path} -> {e}")

    def list_all(self, path: str) -> list[dict]:
        items: list[dict] = []
        page = 1
        while True:
            q = urllib.parse.urlencode({"count": 100, "page": page})
            payload = self._req("GET", f"{path}?{q}")
            batch = payload.get("data") or []
            items.extend(batch)
            total = int(payload.get("total") or len(items))
            if len(items) >= total or not batch:
                break
            page += 1
        return items

    def find_by_name(self, items: list[dict], name: str) -> dict | None:
        for it in items:
            if it.get("name") == name:
                return it
        return None


def ensure_shelf(client: BookStackClient, shelves: list[dict], name: str) -> dict:
    existing = client.find_by_name(shelves, name)
    if existing:
        return existing
    print(f"  create shelf: {name}")
    created = client._req("POST", "/api/shelves", {"name": name, "description": "", "books": []})
    shelves.append(created)
    return created


def ensure_book(
    client: BookStackClient,
    books: list[dict],
    name: str,
    description: str,
) -> dict:
    existing = client.find_by_name(books, name)
    if existing:
        if (existing.get("description") or "") != (description or "") and not client.dry_run:
            print(f"  update book description: {name}")
            updated = client._req(
                "PUT",
                f"/api/books/{existing['id']}",
                {"name": name, "description": description or ""},
            )
            existing.update(updated)
        return existing
    print(f"  create book: {name}")
    created = client._req(
        "POST",
        "/api/books",
        {"name": name, "description": description or ""},
    )
    books.append(created)
    return created


def attach_book_to_shelf(client: BookStackClient, shelf: dict, book_id: int) -> None:
    if client.dry_run:
        print(f"DRY-RUN attach book {book_id} → shelf {shelf.get('name')}")
        return
    # Re-fetch shelf for current books list
    fresh = client._req("GET", f"/api/shelves/{shelf['id']}")
    book_ids = [b["id"] for b in (fresh.get("books") or [])]
    if book_id in book_ids:
        return
    book_ids.append(book_id)
    print(f"  attach book {book_id} to shelf {shelf.get('name')}")
    client._req(
        "PUT",
        f"/api/shelves/{shelf['id']}",
        {
            "name": fresh.get("name") or shelf.get("name"),
            "description": fresh.get("description") or "",
            "books": book_ids,
        },
    )


def list_pages_for_book(client: BookStackClient, book_id: int) -> list[dict]:
    items: list[dict] = []
    page = 1
    while True:
        q = urllib.parse.urlencode(
            {"count": 100, "page": page, "filter[book_id]": book_id}
        )
        payload = client._req("GET", f"/api/pages?{q}")
        batch = payload.get("data") or []
        items.extend(batch)
        total = int(payload.get("total") or len(items))
        if len(items) >= total or not batch:
            break
        page += 1
    return items


def ensure_page(
    client: BookStackClient,
    pages: list[dict],
    book_id: int,
    name: str,
    markdown: str,
    priority: int,
) -> None:
    existing = client.find_by_name(pages, name)
    body = {"book_id": book_id, "name": name, "markdown": markdown, "priority": priority}
    if existing:
        print(f"    update page: {name}")
        client._req("PUT", f"/api/pages/{existing['id']}", body)
    else:
        print(f"    create page: {name}")
        created = client._req("POST", "/api/pages", body)
        pages.append(created)


def chapter_files(book_dir: Path) -> list[Path]:
    files = sorted(
        p
        for p in book_dir.iterdir()
        if p.is_file() and CHAPTER_MD_RE.match(p.name)
    )
    return files


def import_standard_book(
    client: BookStackClient,
    shelves: list[dict],
    books: list[dict],
    book_dir: Path,
    meta: dict[str, Any],
) -> None:
    book_name = str(meta.get("book") or book_dir.name)
    shelf_name = str(meta.get("shelf") or "Plattform")
    description = str(meta.get("description") or "")
    print(f"==> book {book_name!r} (shelf {shelf_name!r}) from {book_dir}")
    shelf = ensure_shelf(client, shelves, shelf_name)
    book = ensure_book(client, books, book_name, description)
    attach_book_to_shelf(client, shelf, int(book["id"]))
    pages = list_pages_for_book(client, int(book["id"])) if not client.dry_run else []
    for i, path in enumerate(chapter_files(book_dir), start=1):
        raw = path.read_text(encoding="utf-8")
        title = page_title(raw, path.stem)
        md = strip_frontmatter(raw)
        ensure_page(client, pages, int(book["id"]), title, md, priority=i * 10)


def import_files_as_books(
    client: BookStackClient,
    shelves: list[dict],
    books: list[dict],
    book_dir: Path,
    meta: dict[str, Any],
) -> None:
    shelf_name = str(meta.get("shelf") or "Anleitungen")
    print(f"==> files_as_books in {book_dir} → shelf {shelf_name!r}")
    shelf = ensure_shelf(client, shelves, shelf_name)
    for path in chapter_files(book_dir):
        raw = path.read_text(encoding="utf-8")
        title = page_title(raw, path.stem)
        md = strip_frontmatter(raw)
        book = ensure_book(client, books, title, str(meta.get("description") or ""))
        attach_book_to_shelf(client, shelf, int(book["id"]))
        pages = list_pages_for_book(client, int(book["id"])) if not client.dry_run else []
        ensure_page(client, pages, int(book["id"]), title, md, priority=10)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import BookStack books from markdown")
    parser.add_argument(
        "--books-dir",
        type=Path,
        default=None,
        help="Path to docs/bookstack/books (default: auto-detect)",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", action="append", default=[], help="Only import these directory slugs")
    args = parser.parse_args()

    root = Path(__file__).resolve()
    # scripts/bookstack-import/import_books.py → repo root is parents[2]
    # docs/bookstack/scripts/ would be parents[3] — support both layouts via --books-dir / cwd
    candidates = [
        args.books_dir,
        Path.cwd() / "docs/bookstack/books",
        root.parents[2] / "docs/bookstack/books",
        root.parents[1] / "docs/bookstack/books",
    ]
    books_dir = next((p for p in candidates if p and p.is_dir()), None)
    if books_dir is None:
        die("books directory not found; pass --books-dir")

    url = os.environ.get("BOOKSTACK_URL", "").rstrip("/")
    token_id = os.environ.get("BOOKSTACK_TOKEN_ID", "")
    token_secret = os.environ.get("BOOKSTACK_TOKEN_SECRET", "")
    if not args.dry_run and (not url or not token_id or not token_secret):
        die("Set BOOKSTACK_URL, BOOKSTACK_TOKEN_ID, BOOKSTACK_TOKEN_SECRET")

    client = BookStackClient(url or "https://example.invalid", token_id or "x", token_secret or "y", dry_run=args.dry_run)

    shelves = client.list_all("/api/shelves") if not args.dry_run else []
    books = client.list_all("/api/books") if not args.dry_run else []

    only = set(args.only)
    dirs = sorted(p for p in books_dir.iterdir() if p.is_dir())
    if only:
        dirs = [p for p in dirs if p.name in only]
    if not dirs:
        die(f"no book directories under {books_dir}")

    for book_dir in dirs:
        meta_path = book_dir / "meta.yaml"
        if meta_path.is_file():
            meta = load_yaml(meta_path.read_text(encoding="utf-8"))
        else:
            # Fallback: directory name as book on shelf Plattform
            meta = {"book": book_dir.name.replace("-", " ").title(), "shelf": "Plattform"}
            print(f"WARN: {meta_path} missing — using defaults {meta}", file=sys.stderr)

        mode = str(meta.get("mode") or "book")
        if mode == "files_as_books":
            import_files_as_books(client, shelves, books, book_dir, meta)
        else:
            import_standard_book(client, shelves, books, book_dir, meta)

    print("OK: import finished")


if __name__ == "__main__":
    main()
