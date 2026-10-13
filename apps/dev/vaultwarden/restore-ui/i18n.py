"""German (default) / English UI strings for vw-restore."""

from __future__ import annotations

from typing import Any

COOKIE_NAME = "vw_restore_lang"
SUPPORTED = frozenset({"de", "en"})
DEFAULT_LANG = "de"

TRANSLATIONS: dict[str, dict[str, str]] = {
    "de": {
        "lang_switch_aria": "Sprache",
        "brand_title": "Vaultwarden Restore",
        "brand_subtitle": "Backup in den Namespace vaultwarden wiederherstellen",
        "page_title": "Vaultwarden Restore",
        "job_page_title": "{job_name} · Vaultwarden Restore",
        "job_heading": "Restore-Job",
        "alert_already_running": "Wiederherstellung läuft bereits:",
        "stat_backups": "Backups",
        "stat_latest": "Neuesstes",
        "stat_state": "Status",
        "stat_none": "keines",
        "stat_running": "läuft",
        "stat_ready": "bereit",
        "select_backup": "Backup wählen",
        "archives_count": "{n} Archive",
        "latest_label": "latest",
        "newest_backup": "Neuestes Backup",
        "empty_archives": "Keine Archive auf dem Backup-Volume gefunden.",
        "restore_safety": "Sicherheit",
        "warning_overwrite": (
            "Vorhandene Daten bleiben erhalten, solange Überschreiben nicht "
            "explizit aktiviert ist. Ohne diese Option bricht der Job ab."
        ),
        "overwrite_title": "Vorhandene Daten überschreiben",
        "overwrite_hint": "Leert das Vaultwarden-Datenverzeichnis inklusive db.sqlite3.",
        "confirm_label": "Zur Bestätigung <strong>RESTORE</strong> eingeben",
        "btn_refresh": "Aktualisieren",
        "btn_restore": "Archiv wiederherstellen",
        "btn_back": "Zurück",
        "recent_jobs": "Letzte Jobs",
        "badge_succeeded": "Erfolgreich",
        "badge_failed": "Fehlgeschlagen",
        "badge_done": "Fertig",
        "job_status": "Job-Status",
        "label_archive": "Archiv",
        "label_mode": "Modus",
        "mode_live": "Live-Anzeige",
        "mode_completed": "Abgeschlossen",
        "label_started": "Gestartet",
        "label_finished": "Beendet",
        "restore_output": "Restore-Ausgabe",
        "auto_refresh": "Auto-Aktualisierung",
        "final_output": "Endausgabe",
        "status_Succeeded": "Erfolgreich",
        "status_Failed": "Fehlgeschlagen",
        "status_Running": "Läuft",
        "status_Pending": "Wartend",
        "status_NotFound": "Nicht gefunden",
        "err_already_running": "Es läuft bereits ein Restore-Job.",
        "err_confirm": "Zur Bestätigung RESTORE eingeben.",
        "err_invalid_archive": "Ungültiger Archivname.",
        "err_archive_not_found": "Archiv nicht gefunden: {archive}",
        "err_force_required": (
            "Überschreiben ist erforderlich: „Vorhandene Daten überschreiben“ "
            "aktivieren (PVC enthält bereits db.sqlite3; ohne Force bricht der Worker ab)."
        ),
        "err_create_job": "Job konnte nicht erstellt werden: {reason}",
        "logs_job_not_found": "Job nicht gefunden",
        "logs_no_pods": "(noch keine Pods)",
        "logs_unavailable": "(Logs nicht verfügbar: {reason})",
        "logo_alt": "Vaultwarden-Logo",
    },
    "en": {
        "lang_switch_aria": "Language",
        "brand_title": "Vaultwarden Restore",
        "brand_subtitle": "Restore a backup into the vaultwarden namespace",
        "page_title": "Vaultwarden Restore",
        "job_page_title": "{job_name} · Vaultwarden Restore",
        "job_heading": "Restore job",
        "alert_already_running": "Restore is already running:",
        "stat_backups": "Backups",
        "stat_latest": "Latest",
        "stat_state": "State",
        "stat_none": "none",
        "stat_running": "running",
        "stat_ready": "ready",
        "select_backup": "Select backup",
        "archives_count": "{n} archives",
        "latest_label": "latest",
        "newest_backup": "Newest backup",
        "empty_archives": "No archives found on the backup volume.",
        "restore_safety": "Restore safety",
        "warning_overwrite": (
            "Existing data is kept unless overwrite is explicitly enabled. "
            "Without this, the job aborts."
        ),
        "overwrite_title": "Overwrite existing data",
        "overwrite_hint": "Clears the Vaultwarden data directory, including db.sqlite3.",
        "confirm_label": "Type <strong>RESTORE</strong> to confirm",
        "btn_refresh": "Refresh",
        "btn_restore": "Restore archive",
        "btn_back": "Back",
        "recent_jobs": "Recent jobs",
        "badge_succeeded": "Succeeded",
        "badge_failed": "Failed",
        "badge_done": "Done",
        "job_status": "Job status",
        "label_archive": "Archive",
        "label_mode": "Mode",
        "mode_live": "Live follow",
        "mode_completed": "Completed",
        "label_started": "Started",
        "label_finished": "Finished",
        "restore_output": "Restore output",
        "auto_refresh": "Auto-refresh",
        "final_output": "Final output",
        "status_Succeeded": "Succeeded",
        "status_Failed": "Failed",
        "status_Running": "Running",
        "status_Pending": "Pending",
        "status_NotFound": "NotFound",
        "err_already_running": "A restore job is already running.",
        "err_confirm": "Type RESTORE to confirm.",
        "err_invalid_archive": "Invalid archive name.",
        "err_archive_not_found": "Archive not found: {archive}",
        "err_force_required": (
            "Overwrite is required: enable \"Overwrite existing data\" "
            "(PVC already has db.sqlite3; without force the worker aborts)."
        ),
        "err_create_job": "Failed to create job: {reason}",
        "logs_job_not_found": "Job not found",
        "logs_no_pods": "(no pods yet)",
        "logs_unavailable": "(logs unavailable: {reason})",
        "logo_alt": "Vaultwarden logo",
    },
}


def normalize_lang(value: str | None) -> str:
    if not value:
        return DEFAULT_LANG
    lang = value.strip().lower()[:2]
    return lang if lang in SUPPORTED else DEFAULT_LANG


def t(key: str, lang: str, **kwargs: Any) -> str:
    lang = normalize_lang(lang)
    catalog = TRANSLATIONS.get(lang) or TRANSLATIONS[DEFAULT_LANG]
    text = catalog.get(key) or TRANSLATIONS[DEFAULT_LANG].get(key) or key
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, ValueError):
            return text
    return text


def make_translator(lang: str):
    lang = normalize_lang(lang)

    def _t(key: str, **kwargs: Any) -> str:
        return t(key, lang, **kwargs)

    return _t
