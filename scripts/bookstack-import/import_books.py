#!/usr/bin/env python3
"""Idempotent BookStack import from docs/bookstack/books/*/meta.yaml + NN-*.md pages.

Env:
  BOOKSTACK_URL            e.g. https://book.stadthagen.dev or http://bookstack.bookstack.svc
  BOOKSTACK_TOKEN_ID       API token id
  BOOKSTACK_TOKEN_SECRET   API token secret
  FORCE_IMPORT             if "1"/"true", ignore version gate

Usage:
  ./import_books.py [--books-dir PATH] [--dry-run] [--only SLUG]
                    [--state-file PATH] [--state-prefix ID] [--force]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import sys
import uuid
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


def load_state(path: Path | None) -> dict[str, str]:
    if path is None or not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        die(f"cannot read state file {path}: {e}")
    if not isinstance(data, dict):
        die(f"state file {path} must be a JSON object")
    return {str(k): str(v) for k, v in data.items()}


def save_state(path: Path | None, state: dict[str, str]) -> None:
    if path is None:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def state_key(prefix: str, slug: str) -> str:
    slug = slug.strip("/")
    if prefix:
        return f"{prefix}/{slug}"
    return slug


def cover_state_key(prefix: str, slug: str, *, book_name: str | None = None) -> str:
    """State key for cover image hash (independent of book_version gate)."""
    base = state_key(prefix, slug)
    if book_name:
        safe = re.sub(r"[^\w.\-]+", "_", book_name.strip())[:80]
        return f"{base}@{safe}@cover"
    return f"{base}@cover"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def resolve_cover_path(book_dir: Path, meta: dict[str, Any], *, chapter_stem: str | None = None) -> Path | None:
    """Resolve cover PNG/JPEG for a book or files_as_books chapter."""
    if chapter_stem:
        covers_map = meta.get("covers") or {}
        if isinstance(covers_map, dict):
            mapped = covers_map.get(f"{chapter_stem}.md") or covers_map.get(chapter_stem)
            if mapped:
                p = book_dir / str(mapped)
                return p if p.is_file() else None
        for candidate in (
            book_dir / "covers" / f"{chapter_stem}.png",
            book_dir / "covers" / f"{chapter_stem}.jpg",
            book_dir / "covers" / f"{chapter_stem}.webp",
            book_dir / f"{chapter_stem}.cover.png",
        ):
            if candidate.is_file():
                return candidate
        return None

    cover = meta.get("cover")
    if cover:
        p = book_dir / str(cover)
        return p if p.is_file() else None
    for candidate in (
        book_dir / "cover.png",
        book_dir / "cover.jpg",
        book_dir / "cover.webp",
    ):
        if candidate.is_file():
            return candidate
    return None


def encode_multipart(fields: dict[str, str], files: dict[str, tuple[str, bytes, str]]) -> tuple[bytes, str]:
    """Build multipart/form-data body. files: name -> (filename, content, content_type)."""
    boundary = f"----BookStackImport{uuid.uuid4().hex}"
    lines: list[bytes] = []
    for name, value in fields.items():
        lines.append(f"--{boundary}".encode())
        lines.append(f'Content-Disposition: form-data; name="{name}"'.encode())
        lines.append(b"")
        lines.append(value.encode())
    for name, (filename, content, content_type) in files.items():
        lines.append(f"--{boundary}".encode())
        lines.append(
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"'.encode()
        )
        lines.append(f"Content-Type: {content_type}".encode())
        lines.append(b"")
        lines.append(content)
    lines.append(f"--{boundary}--".encode())
    lines.append(b"")
    body = b"\r\n".join(lines)
    return body, f"multipart/form-data; boundary={boundary}"


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

    def _req_multipart(
        self,
        method: str,
        path: str,
        fields: dict[str, str],
        files: dict[str, tuple[str, bytes, str]],
    ) -> Any:
        """POST multipart (use fields['_method']='PUT' for book cover updates)."""
        url = f"{self.base}{path}"
        if self.dry_run:
            print(
                f"DRY-RUN {method} {path} multipart fields={list(fields)} files={list(files)}"
            )
            return {"id": 0, "dry_run": True, **{k: fields[k] for k in ("name", "description") if k in fields}}
        body, content_type = encode_multipart(fields, files)
        headers = {
            "Authorization": self.auth,
            "Accept": "application/json",
            "Content-Type": content_type,
        }
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read().decode()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            err = e.read().decode(errors="replace")
            die(f"{method} {path} (multipart) -> HTTP {e.code}: {err[:500]}")
        except urllib.error.URLError as e:
            die(f"{method} {path} (multipart) -> {e}")

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

    def set_book_cover(
        self,
        book_id: int,
        name: str,
        description: str,
        cover_path: Path,
    ) -> dict:
        data = cover_path.read_bytes()
        mime = mimetypes.guess_type(cover_path.name)[0] or "image/png"
        print(f"  set cover: {cover_path.name} ({len(data)} bytes) → book {book_id}")
        # PHP only parses multipart on POST; use _method=PUT for updates.
        return self._req_multipart(
            "POST",
            f"/api/books/{book_id}",
            {
                "_method": "PUT",
                "name": name,
                "description": description or "",
            },
            {"image": (cover_path.name, data, mime)},
        )


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
    *,
    cover_path: Path | None = None,
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
        if cover_path is not None:
            updated = client.set_book_cover(
                int(existing["id"]), name, description or "", cover_path
            )
            if isinstance(updated, dict):
                existing.update(updated)
        return existing
    print(f"  create book: {name}")
    if cover_path is not None:
        data = cover_path.read_bytes()
        mime = mimetypes.guess_type(cover_path.name)[0] or "image/png"
        print(f"  create with cover: {cover_path.name} ({len(data)} bytes)")
        created = client._req_multipart(
            "POST",
            "/api/books",
            {"name": name, "description": description or ""},
            {"image": (cover_path.name, data, mime)},
        )
    else:
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


def maybe_apply_cover(
    client: BookStackClient,
    book: dict,
    name: str,
    description: str,
    cover_path: Path | None,
    state: dict[str, str],
    cover_key: str,
) -> bool:
    """Upload cover if present and hash differs from state. Returns True if state should be saved."""
    if cover_path is None or book.get("id") is None:
        return False
    digest = sha256_file(cover_path)
    if state.get(cover_key) == digest:
        print(f"  cover unchanged ({cover_path.name})")
        return False
    client.set_book_cover(int(book["id"]), name, description, cover_path)
    state[cover_key] = digest
    print(f"  STATE {cover_key}={digest[:12]}…")
    return True


def import_standard_book(
    client: BookStackClient,
    shelves: list[dict],
    books: list[dict],
    book_dir: Path,
    meta: dict[str, Any],
    *,
    state: dict[str, str],
    state_prefix: str,
    pages_only: bool = False,
) -> bool:
    """Import book pages (+ cover). Returns True if state was mutated."""
    book_name = str(meta.get("book") or book_dir.name)
    shelf_name = str(meta.get("shelf") or "Plattform")
    description = str(meta.get("description") or "")
    cover_path = resolve_cover_path(book_dir, meta)
    cover_key = cover_state_key(state_prefix, book_dir.name)
    dirty = False
    print(f"==> book {book_name!r} (shelf {shelf_name!r}) from {book_dir}")
    shelf = ensure_shelf(client, shelves, shelf_name)

    if pages_only:
        book = client.find_by_name(books, book_name)
        if book is None:
            # Cover-only refresh still needs the book to exist
            book = ensure_book(client, books, book_name, description, cover_path=None)
            attach_book_to_shelf(client, shelf, int(book["id"]))
        if maybe_apply_cover(client, book, book_name, description, cover_path, state, cover_key):
            dirty = True
        return dirty

    # Pass cover on create; on update upload only when hash differs (avoid re-upload every import)
    existing = client.find_by_name(books, book_name)
    upload_now = False
    if cover_path is not None:
        digest = sha256_file(cover_path)
        upload_now = state.get(cover_key) != digest
    book = ensure_book(
        client,
        books,
        book_name,
        description,
        cover_path=cover_path if (upload_now and existing is None) else None,
    )
    if existing is not None and upload_now and cover_path is not None:
        client.set_book_cover(int(book["id"]), book_name, description, cover_path)
    if cover_path is not None and upload_now:
        state[cover_key] = sha256_file(cover_path)
        dirty = True
        print(f"  STATE {cover_key}={state[cover_key][:12]}…")

    attach_book_to_shelf(client, shelf, int(book["id"]))
    pages = list_pages_for_book(client, int(book["id"])) if not client.dry_run else []
    for i, path in enumerate(chapter_files(book_dir), start=1):
        raw = path.read_text(encoding="utf-8")
        title = page_title(raw, path.stem)
        md = strip_frontmatter(raw)
        ensure_page(client, pages, int(book["id"]), title, md, priority=i * 10)
    return dirty


def import_files_as_books(
    client: BookStackClient,
    shelves: list[dict],
    books: list[dict],
    book_dir: Path,
    meta: dict[str, Any],
    *,
    state: dict[str, str],
    state_prefix: str,
    pages_only: bool = False,
) -> bool:
    shelf_name = str(meta.get("shelf") or "Anleitungen")
    dirty = False
    print(f"==> files_as_books in {book_dir} → shelf {shelf_name!r}")
    shelf = ensure_shelf(client, shelves, shelf_name)
    for path in chapter_files(book_dir):
        raw = path.read_text(encoding="utf-8")
        title = page_title(raw, path.stem)
        md = strip_frontmatter(raw)
        cover_path = resolve_cover_path(book_dir, meta, chapter_stem=path.stem)
        cover_key = cover_state_key(state_prefix, book_dir.name, book_name=title)
        description = str(meta.get("description") or "")

        if pages_only:
            book = client.find_by_name(books, title)
            if book is None:
                book = ensure_book(client, books, title, description, cover_path=None)
                attach_book_to_shelf(client, shelf, int(book["id"]))
            if maybe_apply_cover(client, book, title, description, cover_path, state, cover_key):
                dirty = True
            continue

        existing = client.find_by_name(books, title)
        upload_now = False
        if cover_path is not None:
            digest = sha256_file(cover_path)
            upload_now = state.get(cover_key) != digest
        book = ensure_book(
            client,
            books,
            title,
            description,
            cover_path=cover_path if (upload_now and existing is None) else None,
        )
        if existing is not None and upload_now and cover_path is not None:
            client.set_book_cover(int(book["id"]), title, description, cover_path)
        if cover_path is not None and upload_now:
            state[cover_key] = sha256_file(cover_path)
            dirty = True
            print(f"  STATE {cover_key}={state[cover_key][:12]}…")
        attach_book_to_shelf(client, shelf, int(book["id"]))
        pages = list_pages_for_book(client, int(book["id"])) if not client.dry_run else []
        ensure_page(client, pages, int(book["id"]), title, md, priority=10)
    return dirty


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
    parser.add_argument(
        "--state-file",
        type=Path,
        default=None,
        help="JSON map of state keys → book_version (skip unchanged)",
    )
    parser.add_argument(
        "--state-prefix",
        default="",
        help="Prefix for state keys (source id), e.g. infra-lab-platform",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Ignore version gate (or set FORCE_IMPORT=1)",
    )
    args = parser.parse_args()

    force = args.force or os.environ.get("FORCE_IMPORT", "").lower() in ("1", "true", "yes")

    root = Path(__file__).resolve()
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

    client = BookStackClient(
        url or "https://example.invalid",
        token_id or "x",
        token_secret or "y",
        dry_run=args.dry_run,
    )

    state = load_state(args.state_file)
    state_dirty = False

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
            meta = {"book": book_dir.name.replace("-", " ").title(), "shelf": "Plattform"}
            print(f"WARN: {meta_path} missing — using defaults {meta}", file=sys.stderr)

        version = str(meta.get("book_version") or "").strip()
        key = state_key(args.state_prefix, book_dir.name)
        mode = str(meta.get("mode") or "book")
        skip_pages = bool(not force and version and state.get(key) == version)

        if skip_pages:
            print(f"SKIP pages {book_dir.name} (book_version={version} unchanged, key={key})")
            # Still refresh covers when the image hash changed
            if mode == "files_as_books":
                if import_files_as_books(
                    client,
                    shelves,
                    books,
                    book_dir,
                    meta,
                    state=state,
                    state_prefix=args.state_prefix,
                    pages_only=True,
                ):
                    state_dirty = True
            else:
                if import_standard_book(
                    client,
                    shelves,
                    books,
                    book_dir,
                    meta,
                    state=state,
                    state_prefix=args.state_prefix,
                    pages_only=True,
                ):
                    state_dirty = True
            continue

        if mode == "files_as_books":
            if import_files_as_books(
                client,
                shelves,
                books,
                book_dir,
                meta,
                state=state,
                state_prefix=args.state_prefix,
            ):
                state_dirty = True
        else:
            if import_standard_book(
                client,
                shelves,
                books,
                book_dir,
                meta,
                state=state,
                state_prefix=args.state_prefix,
            ):
                state_dirty = True

        if version:
            state[key] = version
            state_dirty = True
            print(f"STATE {key}={version}")

    if state_dirty and not args.dry_run:
        save_state(args.state_file, state)
    elif state_dirty and args.dry_run:
        print(f"DRY-RUN would write state → {args.state_file}")

    print("OK: import finished")


if __name__ == "__main__":
    main()
