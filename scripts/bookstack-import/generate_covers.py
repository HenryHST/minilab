#!/usr/bin/env python3
"""Generate BookStack book cover PNGs (880×500) for docs/bookstack/books/*/cover.png.

Usage:
  python3 generate_covers.py [--books-dir PATH] [--only SLUG]
  python3 generate_covers.py --preset infra-lab
  python3 generate_covers.py --preset minilab --books-dir /path/to/minilab/docs/bookstack/books
"""

from __future__ import annotations

import argparse
import math
import os
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFont

W, H = 880, 500
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BRAND = "Stadthagen Home"


def font(path: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def hex_rgb(c: str) -> tuple[int, int, int]:
    c = c.lstrip("#")
    return int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def gradient_bg(
    draw: ImageDraw.ImageDraw,
    c1: str,
    c2: str,
    *,
    angle_deg: float = 28.0,
) -> None:
    a = hex_rgb(c1)
    b = hex_rgb(c2)
    rad = math.radians(angle_deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    # Project corners onto axis for normalize
    corners = [(0, 0), (W, 0), (0, H), (W, H)]
    projs = [x * cos_a + y * sin_a for x, y in corners]
    pmin, pmax = min(projs), max(projs)
    # Coarse scanline for speed
    step = 2
    for y in range(0, H, step):
        for x in range(0, W, step):
            t = ((x * cos_a + y * sin_a) - pmin) / (pmax - pmin + 1e-9)
            col = lerp(a, b, max(0.0, min(1.0, t)))
            draw.rectangle([x, y, x + step, y + step], fill=col)


def soft_vignette(img: Image.Image) -> None:
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for i in range(40):
        alpha = int(18 * (i / 40) ** 2)
        d.rectangle([i, i, W - 1 - i, H - 1 - i], outline=(0, 0, 0, alpha))
    img.alpha_composite(overlay)


def draw_title(
    draw: ImageDraw.ImageDraw,
    title: str,
    subtitle: str,
    *,
    accent: str,
) -> None:
    title_font = font(FONT_BOLD, 54 if len(title) < 18 else 42 if len(title) < 28 else 34)
    sub_font = font(FONT_REG, 22)
    brand_font = font(FONT_REG, 16)

    # Accent bar
    acc = hex_rgb(accent)
    draw.rounded_rectangle([48, 56, 72, 200], radius=8, fill=acc)

    # Wrap title if needed
    max_w = W - 140
    words = title.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=title_font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    lines = lines[:3]

    y = 70
    for line in lines:
        draw.text((96, y), line, font=title_font, fill=(245, 247, 250))
        y += int(title_font.size * 1.15)

    draw.text((96, y + 8), subtitle, font=sub_font, fill=(180, 190, 205))
    draw.text((96, H - 52), BRAND, font=brand_font, fill=(140, 150, 165))


IconFn = Callable[[ImageDraw.ImageDraw, int, int, int, tuple[int, int, int]], None]


def icon_layers(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    for i, r in enumerate((s, int(s * 0.72), int(s * 0.44))):
        d.rounded_rectangle(
            [cx - r, cy - r // 2 + i * 6, cx + r, cy + r // 2 + i * 6],
            radius=12,
            outline=c,
            width=4,
        )


def icon_cube(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    # isometric-ish hexagon cube
    pts_top = [
        (cx, cy - s),
        (cx + s, cy - s // 2),
        (cx, cy),
        (cx - s, cy - s // 2),
    ]
    pts_left = [(cx - s, cy - s // 2), (cx, cy), (cx, cy + s), (cx - s, cy + s // 2)]
    pts_right = [(cx + s, cy - s // 2), (cx, cy), (cx, cy + s), (cx + s, cy + s // 2)]
    d.polygon(pts_top, outline=c)
    d.polygon(pts_left, outline=c)
    d.polygon(pts_right, outline=c)
    d.line([cx, cy - s, cx, cy + s], fill=c, width=3)


def icon_server(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    for i in range(3):
        y0 = cy - s + i * (2 * s // 3 + 8)
        d.rounded_rectangle([cx - s, y0, cx + s, y0 + 2 * s // 3], radius=10, outline=c, width=4)
        d.ellipse([cx + s - 28, y0 + 14, cx + s - 12, y0 + 30], fill=c)


def icon_cluster(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    r = s // 3
    nodes = [
        (cx, cy - s + r),
        (cx - s + r, cy + s // 3),
        (cx + s - r, cy + s // 3),
    ]
    for a, b in ((0, 1), (1, 2), (2, 0)):
        d.line([nodes[a], nodes[b]], fill=c, width=4)
    for x, y in nodes:
        d.ellipse([x - r, y - r, x + r, y + r], outline=c, width=4)


def icon_network(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    for r in (s // 3, 2 * s // 3, s):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=c, width=3)
    d.line([cx - s, cy, cx + s, cy], fill=c, width=3)
    d.line([cx, cy - s, cx, cy + s], fill=c, width=3)


def icon_gitops(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    # circular arrows (simplified)
    bbox = [cx - s, cy - s, cx + s, cy + s]
    d.arc(bbox, 40, 300, fill=c, width=5)
    # arrow head
    d.polygon(
        [(cx + s - 8, cy - 20), (cx + s + 18, cy), (cx + s - 8, cy + 20)],
        fill=c,
    )
    d.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], outline=c, width=4)


def icon_shield(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    pts = [
        (cx, cy - s),
        (cx + s, cy - s // 2),
        (cx + s * 4 // 5, cy + s // 2),
        (cx, cy + s),
        (cx - s * 4 // 5, cy + s // 2),
        (cx - s, cy - s // 2),
    ]
    d.polygon(pts, outline=c)
    d.line([(cx, cy - s // 3), (cx, cy + s // 3)], fill=c, width=4)


def icon_id(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.ellipse([cx - s // 2, cy - s, cx + s // 2, cy - s // 5], outline=c, width=4)
    d.arc([cx - s, cy - s // 4, cx + s, cy + s], 200, 340, fill=c, width=4)
    d.rounded_rectangle([cx - s, cy + s // 4, cx + s, cy + s], radius=12, outline=c, width=4)


def icon_db(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.ellipse([cx - s, cy - s, cx + s, cy - s // 2], outline=c, width=4)
    d.line([cx - s, cy - 3 * s // 4, cx - s, cy + 3 * s // 4], fill=c, width=4)
    d.line([cx + s, cy - 3 * s // 4, cx + s, cy + 3 * s // 4], fill=c, width=4)
    d.arc([cx - s, cy + s // 2, cx + s, cy + s], 0, 180, fill=c, width=4)
    d.arc([cx - s, cy - s // 8, cx + s, cy + s // 3], 0, 180, fill=c, width=3)


def icon_storage(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.rounded_rectangle([cx - s, cy - s // 2, cx + s, cy + s // 2], radius=16, outline=c, width=4)
    d.ellipse([cx - s // 3, cy - s // 6, cx - s // 8, cy + s // 6], outline=c, width=3)
    d.line([cx, cy - s // 4, cx + s - 24, cy - s // 4], fill=c, width=3)
    d.line([cx, cy, cx + s - 24, cy], fill=c, width=3)
    d.line([cx, cy + s // 4, cx + s - 40, cy + s // 4], fill=c, width=3)


def icon_book(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.rounded_rectangle([cx - s, cy - s, cx + s, cy + s], radius=8, outline=c, width=4)
    d.line([cx, cy - s + 8, cx, cy + s - 8], fill=c, width=4)
    d.arc([cx - s + 10, cy - 20, cx - 8, cy + 20], 270, 90, fill=c, width=3)
    d.arc([cx + 8, cy - 20, cx + s - 10, cy + 20], 90, 270, fill=c, width=3)


def icon_home(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    roof = [(cx, cy - s), (cx + s, cy - s // 5), (cx - s, cy - s // 5)]
    d.polygon(roof, outline=c)
    d.rounded_rectangle([cx - 2 * s // 3, cy - s // 5, cx + 2 * s // 3, cy + s], radius=6, outline=c, width=4)
    d.rectangle([cx - s // 6, cy + s // 4, cx + s // 6, cy + s], outline=c, width=3)


def icon_wave(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    for i, amp in enumerate((s, int(s * 0.7), int(s * 0.4))):
        pts = []
        for x in range(cx - s, cx + s + 1, 8):
            y = cy + int(math.sin((x - cx) / 28 + i) * amp / 3) + i * 18 - 18
            pts.append((x, y))
        if len(pts) > 1:
            d.line(pts, fill=c, width=4)


def icon_search(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    r = int(s * 0.55)
    d.ellipse([cx - r - 10, cy - r - 10, cx + r - 10, cy + r - 10], outline=c, width=5)
    d.line([cx + r - 18, cy + r - 18, cx + s, cy + s], fill=c, width=6)


def icon_doc(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.rounded_rectangle([cx - s // 2, cy - s, cx + s // 2, cy + s], radius=8, outline=c, width=4)
    d.line([cx + s // 6, cy - s, cx + s // 2, cy - s // 2], fill=c, width=3)
    for i in range(3):
        y = cy - s // 3 + i * 28
        d.line([cx - s // 3, y, cx + s // 3, y], fill=c, width=3)


def icon_terminal(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.rounded_rectangle([cx - s, cy - int(s * 0.7), cx + s, cy + int(s * 0.7)], radius=12, outline=c, width=4)
    d.line([(cx - s // 2, cy - 10), (cx - 10, cy), (cx - s // 2, cy + 10)], fill=c, width=4)
    d.line([cx, cy + 16, cx + s // 2, cy + 16], fill=c, width=4)


def icon_mqtt(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], fill=c)
    for r in (s // 2, int(s * 0.75), s):
        d.arc([cx - r, cy - r, cx + r, cy + r], 220, 320, fill=c, width=4)


def icon_workflow(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    boxes = [
        (cx - s, cy - s // 2),
        (cx - 20, cy - s // 2),
        (cx + s // 2, cy + s // 4),
    ]
    for x, y in boxes:
        d.rounded_rectangle([x, y, x + 50, y + 36], radius=8, outline=c, width=3)
    d.line([boxes[0][0] + 50, boxes[0][1] + 18, boxes[1][0], boxes[1][1] + 18], fill=c, width=3)
    d.line([boxes[1][0] + 25, boxes[1][1] + 36, boxes[2][0] + 25, boxes[2][1]], fill=c, width=3)


def icon_badge(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.rounded_rectangle([cx - s, cy - s // 2, cx + s, cy + s // 2], radius=s // 2, outline=c, width=4)
    d.ellipse([cx - s + 16, cy - 16, cx - s + 48, cy + 16], outline=c, width=3)


def icon_clock(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.ellipse([cx - s, cy - s, cx + s, cy + s], outline=c, width=4)
    d.line([cx, cy, cx, cy - int(s * 0.55)], fill=c, width=4)
    d.line([cx, cy, cx + int(s * 0.4), cy + 10], fill=c, width=4)


def icon_scan(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.rounded_rectangle([cx - s, cy - s, cx + s, cy + s], radius=10, outline=c, width=3)
    d.line([cx - s, cy, cx + s, cy], fill=c, width=4)
    for x, y, dx, dy in (
        (cx - s, cy - s, 30, 0),
        (cx - s, cy - s, 0, 30),
        (cx + s, cy - s, -30, 0),
        (cx + s, cy - s, 0, 30),
        (cx - s, cy + s, 30, 0),
        (cx - s, cy + s, 0, -30),
        (cx + s, cy + s, -30, 0),
        (cx + s, cy + s, 0, -30),
    ):
        d.line([(x, y), (x + dx, y + dy)], fill=c, width=4)


def icon_bookmark(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    pts = [
        (cx - s // 2, cy - s),
        (cx + s // 2, cy - s),
        (cx + s // 2, cy + s),
        (cx, cy + s // 2),
        (cx - s // 2, cy + s),
    ]
    d.polygon(pts, outline=c)


def icon_audio(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    for i, hgt in enumerate((s // 3, s // 2, s, int(s * 0.7), s // 2)):
        x = cx - s + i * (2 * s // 4)
        d.rounded_rectangle([x, cy - hgt, x + 18, cy + hgt], radius=6, outline=c, width=3)


def icon_code(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.line([(cx - s, cy), (cx - s // 3, cy - s // 2), (cx - s, cy - s)], fill=c, width=4)
    d.line([(cx + s, cy), (cx + s // 3, cy - s // 2), (cx + s, cy - s)], fill=c, width=4)
    d.line([cx - s // 4, cy + s // 3, cx + s // 4, cy - s // 3], fill=c, width=4)


def icon_key(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.ellipse([cx - s, cy - s // 2, cx - s // 6, cy + s // 2], outline=c, width=4)
    d.line([cx - s // 4, cy, cx + s, cy], fill=c, width=5)
    d.line([cx + s // 2, cy, cx + s // 2, cy + s // 3], fill=c, width=4)
    d.line([cx + 3 * s // 4, cy, cx + 3 * s // 4, cy + s // 4], fill=c, width=4)


def icon_status(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    for i, col_y in enumerate((-s // 2, 0, s // 2)):
        d.ellipse([cx - s, cy + col_y - 18, cx - s + 36, cy + col_y + 18], outline=c, width=3)
        d.line([cx - s + 50, cy + col_y, cx + s, cy + col_y], fill=c, width=4)


def icon_chip(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int, c: tuple[int, int, int]) -> None:
    d.rounded_rectangle([cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2], radius=10, outline=c, width=4)
    for i in range(-2, 3):
        d.line([cx + i * 18, cy - s // 2, cx + i * 18, cy - s // 2 - 22], fill=c, width=3)
        d.line([cx + i * 18, cy + s // 2, cx + i * 18, cy + s // 2 + 22], fill=c, width=3)
        d.line([cx - s // 2, cy + i * 18, cx - s // 2 - 22, cy + i * 18], fill=c, width=3)
        d.line([cx + s // 2, cy + i * 18, cx + s // 2 + 22, cy + i * 18], fill=c, width=3)


CoverSpec = tuple[str, str, str, str, str, IconFn]
# slug -> (title, subtitle, bg1, bg2, accent, icon)


INFRA_LAB: dict[str, CoverSpec] = {
    "infra-lab": (
        "Infra_LAB",
        "Provisioning & Betriebsschichten",
        "#0B1C2C",
        "#163A4A",
        "#F0A202",
        icon_layers,
    ),
    "opentofu": (
        "OpenTofu",
        "CLI · Stacks · State",
        "#0A2420",
        "#145A4C",
        "#3ECF8E",
        icon_cube,
    ),
    "proxmox": (
        "Proxmox",
        "Templates · VMs · LXC",
        "#2A1208",
        "#6B2D12",
        "#E5702A",
        icon_server,
    ),
    "k3s": (
        "K3s",
        "nXk3 Bootstrap & Day-2",
        "#0B1A33",
        "#1A3F7A",
        "#4DA3FF",
        icon_cluster,
    ),
    "cilium": (
        "Cilium",
        "CNI · BGP · Dual-Stack",
        "#0A1F2E",
        "#0E4A5C",
        "#2EC4B6",
        icon_network,
    ),
    "argo-cd": (
        "Argo CD",
        "GitOps auf nXk3",
        "#1A1208",
        "#4A2C0A",
        "#EF7B2D",
        icon_gitops,
    ),
}


MINILAB: dict[str, CoverSpec] = {
    "minilab": (
        "Minilab",
        "Plattform · Apps · GitOps",
        "#0B1C2C",
        "#1B3A4A",
        "#5B9BD5",
        icon_layers,
    ),
    "authentik": (
        "authentik",
        "IdP · OIDC · Brand",
        "#1A1020",
        "#3A2048",
        "#FD4B2D",
        icon_id,
    ),
    "cloudnative-pg": (
        "CloudNativePG",
        "Postgres Operator",
        "#0A1F2A",
        "#0E4A3C",
        "#2DB88A",
        icon_db,
    ),
    "longhorn": (
        "Longhorn",
        "Default Storage",
        "#1A1008",
        "#4A2808",
        "#F2A93B",
        icon_storage,
    ),
    "kyverno": (
        "Kyverno",
        "Admission · Policies",
        "#0E1A28",
        "#1E3A58",
        "#326CE5",
        icon_shield,
    ),
    "trivy-operator": (
        "Trivy Operator",
        "Vulnerability Scan",
        "#141820",
        "#243040",
        "#1904DA",
        icon_scan,
    ),
    "mosquitto": (
        "Mosquitto",
        "MQTT Broker",
        "#0A1820",
        "#0E3848",
        "#3C9DD0",
        icon_mqtt,
    ),
    "n8n": (
        "n8n",
        "Workflow Automation",
        "#1A1018",
        "#3A1830",
        "#EA4B71",
        icon_workflow,
    ),
    "paperless": (
        "Paperless-ngx",
        "Dokumente · OCR",
        "#101820",
        "#1E3040",
        "#17541F",
        icon_doc,
    ),
    "audiobookshelf": (
        "Audiobookshelf",
        "Hörbücher · Podcasts",
        "#141018",
        "#2A2038",
        "#A78BFA",
        icon_audio,
    ),
    "bytestash": (
        "ByteStash",
        "Code Snippets · OIDC",
        "#101418",
        "#1E2A30",
        "#22C55E",
        icon_code,
    ),
    "karakeep": (
        "Karakeep",
        "Bookmarks · OIDC",
        "#141008",
        "#3A2810",
        "#F59E0B",
        icon_bookmark,
    ),
    "searxng": (
        "SearXNG",
        "Privacy Metasearch",
        "#0C1418",
        "#1A3038",
        "#5EEAD4",
        icon_search,
    ),
    "gatus": (
        "Gatus",
        "Health Dashboard",
        "#0C1814",
        "#1A3830",
        "#34D399",
        icon_status,
    ),
    "kromgo": (
        "Kromgo",
        "Prometheus Badges",
        "#101418",
        "#243038",
        "#60A5FA",
        icon_badge,
    ),
    "termix": (
        "Termix",
        "SSH/RDP Konsole",
        "#0C1014",
        "#1A242C",
        "#94A3B8",
        icon_terminal,
    ),
    "k8tz": (
        "k8tz",
        "Timezone Europe/Berlin",
        "#101820",
        "#1E3048",
        "#38BDF8",
        icon_clock,
    ),
    "nfd": (
        "NFD",
        "Node Feature Discovery",
        "#101418",
        "#283038",
        "#84CC16",
        icon_chip,
    ),
    "home-assistant": (
        "Home Assistant",
        "Smart Home · ha02",
        "#0C1820",
        "#184858",
        "#18BCF2",
        icon_home,
    ),
    "cheat-sheets": (
        "Cheat Sheets",
        "Kommandos & Referenzen",
        "#141210",
        "#2A2418",
        "#D4A373",
        icon_book,
    ),
}

# files_as_books: anleitungen chapter stem -> cover under covers/<stem>.png
ANLEITUNGEN: dict[str, CoverSpec] = {
    "01-erste-schritte": (
        "Erste Schritte",
        "Willkommen am Homelab",
        "#0B1C2C",
        "#1B3A4A",
        "#5B9BD5",
        icon_home,
    ),
    "02-zugang-passwoerter": (
        "Zugang & Passwörter",
        "Vaultwarden · SSO",
        "#1A1010",
        "#3A2020",
        "#F87171",
        icon_key,
    ),
    "03-status-stoerungen": (
        "Status & Störungen",
        "Health prüfen",
        "#0C1814",
        "#1A3830",
        "#34D399",
        icon_status,
    ),
}


def render_cover(spec: CoverSpec, dest: Path) -> None:
    title, subtitle, bg1, bg2, accent, icon = spec
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    gradient_bg(draw, bg1, bg2)
    soft_vignette(img)
    draw = ImageDraw.Draw(img)

    # Decorative arc / plane on the right
    accent_rgb = hex_rgb(accent)
    glow = (*accent_rgb, 40)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([W - 320, -80, W + 120, 360], fill=glow)
    od.ellipse([W - 260, H - 280, W + 80, H + 80], fill=(*accent_rgb, 28))
    img.alpha_composite(overlay)
    draw = ImageDraw.Draw(img)

    icon(draw, W - 170, H // 2 + 10, 88, accent_rgb)
    draw_title(draw, title, subtitle, accent=accent)

    dest.parent.mkdir(parents=True, exist_ok=True)
    rgb = Image.new("RGB", (W, H), (0, 0, 0))
    rgb.paste(img, mask=img.split()[3])
    rgb.save(dest, "PNG", optimize=True)
    print(f"wrote {dest}")


def generate_for_dir(books_dir: Path, catalog: dict[str, CoverSpec], only: set[str]) -> int:
    n = 0
    for slug, spec in catalog.items():
        if only and slug not in only:
            continue
        book_dir = books_dir / slug
        if not book_dir.is_dir():
            print(f"SKIP missing dir {book_dir}")
            continue
        render_cover(spec, book_dir / "cover.png")
        n += 1
    return n


def generate_anleitungen(books_dir: Path, only: set[str]) -> int:
    if only and "anleitungen" not in only and not any(k.startswith("0") for k in only):
        return 0
    base = books_dir / "anleitungen" / "covers"
    n = 0
    for stem, spec in ANLEITUNGEN.items():
        if only and "anleitungen" not in only and stem not in only:
            continue
        render_cover(spec, base / f"{stem}.png")
        n += 1
    return n


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate BookStack cover PNGs")
    parser.add_argument("--books-dir", type=Path, default=None)
    parser.add_argument("--only", action="append", default=[])
    parser.add_argument(
        "--preset",
        choices=("infra-lab", "minilab", "auto"),
        default="auto",
        help="auto: infra-lab catalog if books/infra-lab exists, else minilab catalog",
    )
    args = parser.parse_args()
    only = set(args.only)

    root = Path(__file__).resolve().parents[2]
    books_dir = args.books_dir or (root / "docs/bookstack/books")
    if not books_dir.is_dir():
        raise SystemExit(f"books dir not found: {books_dir}")

    preset = args.preset
    if preset == "auto":
        if (books_dir / "infra-lab").is_dir() or (books_dir / "opentofu").is_dir():
            preset = "infra-lab"
        else:
            preset = "minilab"

    total = 0
    if preset == "infra-lab":
        total += generate_for_dir(books_dir, INFRA_LAB, only)
    else:
        total += generate_for_dir(books_dir, MINILAB, only)
        total += generate_anleitungen(books_dir, only)

    print(f"OK: {total} covers")


if __name__ == "__main__":
    main()
