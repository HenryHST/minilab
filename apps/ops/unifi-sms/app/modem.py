from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field

import asyncssh

from app.config import state
from app.logs import ring
from app.util import normalize_pem_key, split_sms_parts


@dataclass
class ModemStatus:
    configured: bool = False
    connected: bool = False
    last_error: str | None = None
    host: str = ""


@dataclass
class ModemClient:
    _conn: asyncssh.SSHClientConnection | None = None
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    status: ModemStatus = field(default_factory=ModemStatus)

    def refresh_config(self) -> None:
        s = state.settings
        self.status.configured = bool(s.u5g_host and s.u5g_user and s.u5g_ssh_private_key)
        self.status.host = s.u5g_host

    async def close(self) -> None:
        async with self._lock:
            if self._conn:
                self._conn.close()
                await self._conn.wait_closed()
                self._conn = None
            self.status.connected = False

    async def _connect(self) -> asyncssh.SSHClientConnection:
        s = state.settings
        self.refresh_config()
        if not self.status.configured:
            raise RuntimeError("U5G SSH not configured (U5G_HOST/USER/KEY)")
        if self._conn is not None:
            return self._conn

        opts: dict = {
            "host": s.u5g_host,
            "port": s.u5g_port,
            "username": s.u5g_user,
            "client_keys": [
                asyncssh.import_private_key(normalize_pem_key(s.u5g_ssh_private_key))
            ],
            "known_hosts": None,
        }
        if s.u5g_host_key.strip():
            # Accept only pinned key material (OpenSSH known_hosts line or raw key).
            kh = asyncssh.import_known_hosts(f"{s.u5g_host} {s.u5g_host_key.strip()}\n")
            opts["known_hosts"] = kh
        else:
            ring.emit("U5G_HOST_KEY unset — accepting host key once (pin ASAP)", "WARN")

        self._conn = await asyncssh.connect(**opts)
        self.status.connected = True
        self.status.last_error = None
        ring.emit(f"SSH connected to {s.u5g_host}", "INFO")
        return self._conn

    async def send_sms(self, to: str, text: str) -> int:
        parts = split_sms_parts(text, max_bytes=64)
        s = state.settings
        if s.dry_run or not self.status.configured and not s.u5g_host:
            self.refresh_config()
        if s.dry_run or (not s.u5g_host and not self.status.configured):
            ring.emit(f"DRY-RUN send {len(parts)} part(s) to modem", "INFO")
            return len(parts)

        async with self._lock:
            try:
                conn = await self._connect()
                for part in parts:
                    params: dict = {"to": to, "text": part}
                    if s.u5g_iccid.strip():
                        params["iccid"] = s.u5g_iccid.strip()
                    payload = json.dumps({"method": "send-sms", "params": params})
                    cmd = f"ubus -t 60 call uiwwand call '{payload}'"
                    result = await conn.run(cmd, check=False)
                    out = (result.stdout or "") + (result.stderr or "")
                    if result.exit_status != 0 or '"error"' in out:
                        self.status.last_error = out.strip()[:200] or f"exit {result.exit_status}"
                        ring.emit(f"send-sms failed: {self.status.last_error}", "ERROR")
                        raise RuntimeError(self.status.last_error)
                    if '"send-sms":"ok"' not in out.replace(" ", "") and '"result"' not in out:
                        # Some firmwares return {"result":{"send-sms":"ok"}}
                        if "ok" not in out.lower():
                            self.status.last_error = out.strip()[:200] or "unexpected ubus response"
                            ring.emit(f"send-sms unexpected: {self.status.last_error}", "ERROR")
                            raise RuntimeError(self.status.last_error)
                self.status.last_error = None
                return len(parts)
            except Exception as exc:
                self.status.connected = False
                self.status.last_error = str(exc)[:200]
                if self._conn:
                    try:
                        self._conn.close()
                    except Exception:
                        pass
                    self._conn = None
                raise


modem = ModemClient()
