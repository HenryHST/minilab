/** Curated IANA zones for the schedule picker (grouped for UX). */
export const TZ_GROUPS = [
  {
    label: "Europe",
    labelDe: "Europa",
    zones: [
      "Europe/Amsterdam",
      "Europe/Athens",
      "Europe/Berlin",
      "Europe/Brussels",
      "Europe/Bucharest",
      "Europe/Budapest",
      "Europe/Copenhagen",
      "Europe/Dublin",
      "Europe/Helsinki",
      "Europe/Istanbul",
      "Europe/Kyiv",
      "Europe/Lisbon",
      "Europe/London",
      "Europe/Madrid",
      "Europe/Moscow",
      "Europe/Oslo",
      "Europe/Paris",
      "Europe/Prague",
      "Europe/Rome",
      "Europe/Stockholm",
      "Europe/Vienna",
      "Europe/Warsaw",
      "Europe/Zurich",
    ],
  },
  {
    label: "Americas",
    labelDe: "Amerika",
    zones: [
      "America/Sao_Paulo",
      "America/Argentina/Buenos_Aires",
      "America/Santiago",
      "America/Bogota",
      "America/Mexico_City",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/New_York",
      "America/Phoenix",
      "America/Toronto",
      "America/Vancouver",
    ],
  },
  {
    label: "Africa / Middle East",
    labelDe: "Afrika / Naher Osten",
    zones: [
      "Africa/Cairo",
      "Africa/Casablanca",
      "Africa/Johannesburg",
      "Africa/Lagos",
      "Africa/Nairobi",
      "Asia/Dubai",
      "Asia/Jerusalem",
      "Asia/Riyadh",
    ],
  },
  {
    label: "Asia",
    labelDe: "Asien",
    zones: [
      "Asia/Bangkok",
      "Asia/Hong_Kong",
      "Asia/Jakarta",
      "Asia/Kolkata",
      "Asia/Seoul",
      "Asia/Shanghai",
      "Asia/Singapore",
      "Asia/Taipei",
      "Asia/Tokyo",
    ],
  },
  {
    label: "Pacific / Australia",
    labelDe: "Pazifik / Australien",
    zones: [
      "Australia/Adelaide",
      "Australia/Brisbane",
      "Australia/Melbourne",
      "Australia/Perth",
      "Australia/Sydney",
      "Pacific/Auckland",
      "Pacific/Fiji",
      "Pacific/Honolulu",
    ],
  },
  {
    label: "UTC",
    labelDe: "UTC",
    zones: ["UTC", "Etc/UTC", "Etc/GMT"],
  },
];

export function timezoneSelectHtml(selected, locale = "de") {
  const cur = selected || "Europe/Berlin";
  const known = new Set(TZ_GROUPS.flatMap((g) => g.zones));
  const groups = TZ_GROUPS.map((g) => {
    const label = locale === "de" ? g.labelDe : g.label;
    const opts = g.zones
      .map((z) => `<option value="${z}" ${z === cur ? "selected" : ""}>${z}</option>`)
      .join("");
    return `<optgroup label="${label}">${opts}</optgroup>`;
  }).join("");
  const extra = known.has(cur)
    ? ""
    : `<optgroup label="Custom"><option value="${cur}" selected>${cur}</option></optgroup>`;
  return `${groups}${extra}`;
}
