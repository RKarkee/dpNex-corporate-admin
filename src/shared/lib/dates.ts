/**
 * Date formatting for API timestamps.
 *
 * Read off the ISO string rather than through `toLocaleString`. These pages are
 * server-rendered and then hydrated, and a locale- or timezone-dependent format
 * produces different text on each side — React discards the whole subtree and
 * warns. Reading the characters gives the same answer everywhere.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** `2026-09-12T10:10:57.000000Z` → `12 Sep 2026`. */
export function formatDate(value?: string | null): string {
  const iso = String(value ?? "").trim();
  if (iso.length < 10) return "—";

  const [year, month, day] = iso.slice(0, 10).split("-");
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return iso.slice(0, 10);

  return `${Number(day)} ${monthName} ${year}`;
}

/** The same, with the time of day. `—` when there is no timestamp at all. */
export function formatDateTime(value?: string | null): string {
  const iso = String(value ?? "").trim();
  if (iso.length < 10) return "—";

  const date = formatDate(iso);
  const time = iso.slice(11, 16);

  return time ? `${date}, ${time}` : date;
}
