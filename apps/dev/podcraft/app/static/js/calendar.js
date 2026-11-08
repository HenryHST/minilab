/** Backup calendar helpers for Vaultwarden Restore (mockup parity). */

export function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function archiveDateKey(archive) {
  if (!archive?.mtime) return "";
  const d = new Date(archive.mtime);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function backupDateSet(archives) {
  const dates = new Set();
  for (const a of archives || []) {
    const k = archiveDateKey(a);
    if (k) dates.add(k);
  }
  return dates;
}

export function archivesForDate(archives, iso) {
  return (archives || []).filter((a) => archiveDateKey(a) === iso);
}

export function parseSizeMb(sizeH) {
  const m = String(sizeH || "").match(/([\d.]+)\s*([KMGT]?B)/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const u = m[2].toUpperCase();
  if (u === "GB") return n * 1024;
  if (u === "TB") return n * 1024 * 1024;
  if (u === "KB") return n / 1024;
  return n;
}

/**
 * @returns {{ weekdaysHtml: string, gridHtml: string, monthLabel: string }}
 */
export function buildCalendarMarkup({
  cursor,
  locale,
  showWeekNumbers,
  selectedDate,
  backupDates,
  archiveCounts,
  escapeHtml,
}) {
  const loc = locale === "de" ? "de-DE" : "en-GB";
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString(loc, { month: "long", year: "numeric" });
  const weekStart = locale === "de" ? 1 : 0;
  const wd = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, 7 + weekStart + i);
    wd.push(d.toLocaleDateString(loc, { weekday: "short" }).toLowerCase().replace(/\.$/, ""));
  }
  const weekdaysHtml =
    (showWeekNumbers ? `<span class="cal-weeknum-head" title="KW">KW</span>` : "") +
    wd.map((w) => `<span>${escapeHtml(w)}</span>`).join("");

  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const dayDefs = [];
  for (let i = 0; i < startOffset; i++) {
    dayDefs.push({ day: prevDays - startOffset + i + 1, muted: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    dayDefs.push({
      day,
      muted: false,
      iso,
      has: backupDates.has(iso),
      sel: selectedDate === iso,
      count: archiveCounts.get(iso) || 0,
    });
  }
  while (dayDefs.length % 7 !== 0) {
    dayDefs.push({ day: dayDefs.length - (startOffset + daysInMonth) + 1, muted: true });
  }

  const cells = [];
  for (let i = 0; i < dayDefs.length; i += 7) {
    const row = dayDefs.slice(i, i + 7);
    if (showWeekNumbers) {
      const anchor = row.find((d) => !d.muted) || row[0];
      let weekDate;
      if (anchor.iso) {
        const [yy, mm, dd] = anchor.iso.split("-").map(Number);
        weekDate = new Date(yy, mm - 1, dd);
      } else {
        weekDate = new Date(y, m, 1);
      }
      const thursday = new Date(weekDate);
      const dow = (thursday.getDay() + 6) % 7;
      thursday.setDate(thursday.getDate() - dow + 3);
      cells.push(`<span class="cal-weeknum" title="KW">${isoWeekNumber(thursday)}</span>`);
    }
    for (const d of row) {
      if (d.muted) {
        cells.push(`<button type="button" class="cal-day muted" disabled tabindex="-1">${d.day}</button>`);
      } else {
        const tip = d.has ? `${d.count} Backup(s)` : "";
        const cls = `cal-day${d.has ? " has-backup" : ""}${d.sel ? " selected" : ""}`;
        cells.push(
          `<button type="button" class="${cls}" data-date="${d.iso}" ${
            d.has ? `data-tooltip="${escapeHtml(tip)}"` : 'disabled tabindex="-1"'
          }>${d.day}</button>`,
        );
      }
    }
  }
  return { weekdaysHtml, gridHtml: cells.join(""), monthLabel };
}
