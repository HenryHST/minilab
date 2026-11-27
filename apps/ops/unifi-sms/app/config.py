from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Env: UNIFI_SMS_* for UI/auth; U5G_*/WEBHOOK_TOKEN/API_TOKEN unprefixed for Secret keys."""

    model_config = SettingsConfigDict(
        env_file=None,
        extra="ignore",
        populate_by_name=True,
    )

    ui_enabled: bool = Field(default=False, alias="UNIFI_SMS_UI_ENABLED")
    ui_public_url: str = Field(default="https://sms.stadthagen.dev", alias="UNIFI_SMS_UI_PUBLIC_URL")
    auth_mode: str = Field(default="oidc", alias="UNIFI_SMS_AUTH_MODE")
    basic_user: str = Field(default="admin", alias="UNIFI_SMS_BASIC_USER")
    basic_password: str = Field(default="", alias="UNIFI_SMS_BASIC_PASSWORD")
    session_secret: str = Field(default="", alias="UNIFI_SMS_SESSION_SECRET")
    oidc_client_id: str = Field(default="unifi-sms", alias="UNIFI_SMS_OIDC_CLIENT_ID")
    oidc_client_secret: str = Field(default="", alias="UNIFI_SMS_OIDC_CLIENT_SECRET")
    oidc_issuer_url: str = Field(default="", alias="UNIFI_SMS_OIDC_ISSUER_URL")
    oidc_authorization_url: str = Field(default="", alias="UNIFI_SMS_OIDC_AUTHORIZATION_URL")
    oidc_token_url: str = Field(default="", alias="UNIFI_SMS_OIDC_TOKEN_URL")
    oidc_userinfo_url: str = Field(default="", alias="UNIFI_SMS_OIDC_USERINFO_URL")
    oidc_end_session_url: str = Field(default="", alias="UNIFI_SMS_OIDC_END_SESSION_URL")
    oidc_redirect_uri: str = Field(default="", alias="UNIFI_SMS_OIDC_REDIRECT_URI")
    oidc_scopes: str = Field(default="openid email profile", alias="UNIFI_SMS_OIDC_SCOPES")
    oidc_group_claim: str = Field(default="groups", alias="UNIFI_SMS_OIDC_GROUP_CLAIM")

    u5g_host: str = Field(default="", alias="U5G_HOST")
    u5g_port: int = Field(default=22, alias="U5G_PORT")
    u5g_user: str = Field(default="", alias="U5G_USER")
    u5g_ssh_private_key: str = Field(default="", alias="U5G_SSH_PRIVATE_KEY")
    u5g_host_key: str = Field(default="", alias="U5G_HOST_KEY")
    u5g_iccid: str = Field(default="", alias="U5G_ICCID")

    webhook_token: str = Field(default="", alias="WEBHOOK_TOKEN")
    api_token: str = Field(default="", alias="API_TOKEN")

    sms_allow_prefixes: str = Field(default="+49", alias="UNIFI_SMS_ALLOW_PREFIXES")
    sms_rate_per_minute: int = Field(default=10, alias="UNIFI_SMS_RATE_PER_MINUTE")
    sms_daily_cap: int = Field(default=50, alias="UNIFI_SMS_DAILY_CAP")
    dry_run: bool = Field(default=False, alias="UNIFI_SMS_DRY_RUN")


@dataclass
class AppState:
    settings: Settings = field(default_factory=Settings)


def resolve_app_version() -> str:
    env = os.environ.get("APP_VERSION", "").strip()
    if env:
        return env
    for path in (
        Path("/app/VERSION"),
        Path(__file__).resolve().parent.parent / "VERSION",
    ):
        try:
            text = path.read_text(encoding="utf-8").strip()
            if text:
                return text
        except OSError:
            continue
    return "0.0.0-dev"


APP_VERSION = resolve_app_version()
state = AppState()
