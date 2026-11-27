from __future__ import annotations

import re


_E164 = re.compile(r"^\+[1-9]\d{6,14}$")


def mask_phone(number: str) -> str:
    n = (number or "").strip()
    if len(n) < 6:
        return "***"
    return f"{n[:4]}***{n[-2:]}"


def mask_otp_message(text: str) -> str:
    """Hide digit sequences that look like OTP codes."""
    return re.sub(r"\b\d{4,8}\b", "******", text or "")


def validate_e164(number: str, allow_prefixes: str) -> str | None:
    n = (number or "").strip().replace(" ", "")
    if not _E164.match(n):
        return "phone must be E.164 (e.g. +491701234567)"
    prefixes = [p.strip() for p in (allow_prefixes or "").split(",") if p.strip()]
    if prefixes and not any(n.startswith(p) for p in prefixes):
        return f"phone prefix not allowed (need one of: {', '.join(prefixes)})"
    return None


def split_sms_parts(text: str, max_bytes: int = 64) -> list[str]:
    raw = text or ""
    if not raw:
        return [""]
    encoded = raw.encode("utf-8")
    if len(encoded) <= max_bytes:
        return [raw]
    parts: list[str] = []
    buf = bytearray()
    for ch in raw:
        chunk = ch.encode("utf-8")
        if len(buf) + len(chunk) > max_bytes:
            parts.append(buf.decode("utf-8"))
            buf = bytearray(chunk)
        else:
            buf.extend(chunk)
    if buf:
        parts.append(buf.decode("utf-8"))
    return parts
