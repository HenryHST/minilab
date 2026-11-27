from __future__ import annotations

from app.config import state
from app.logs import ring
from app.modem import modem
from app.rate_limit import limiter
from app.util import mask_otp_message, mask_phone, split_sms_parts, validate_e164


async def send_sms(*, to: str, message: str, source: str) -> int:
    """Validate, rate-limit, send via U5G. Returns part count."""
    s = state.settings
    limiter.per_minute = s.sms_rate_per_minute
    limiter.daily_cap = s.sms_daily_cap

    err = validate_e164(to, s.sms_allow_prefixes)
    if err:
        ring.emit(f"{source} rejected {mask_phone(to)}: {err}", "WARN")
        raise ValueError(err)

    parts = split_sms_parts(message, max_bytes=64)
    limit_err = limiter.check(len(parts))
    if limit_err:
        ring.emit(f"{source} rate-limited: {limit_err}", "WARN")
        raise RuntimeError(limit_err)

    modem.refresh_config()
    dry = s.dry_run or not modem.status.configured
    if dry:
        ring.emit(
            f"{source} DRY-RUN {len(parts)} part(s) → {mask_phone(to)} :: {mask_otp_message(message)[:80]}",
            "INFO",
        )
        limiter.commit(len(parts))
        return len(parts)

    n = await modem.send_sms(to, message)
    limiter.commit(n)
    ring.emit(f"{source} sent {n} part(s) → {mask_phone(to)}", "INFO")
    return n
