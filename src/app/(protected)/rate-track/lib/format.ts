/**
 * Display formatting for the Check rate / Track page. Nothing here throws: a
 * value in a shape we did not expect is shown as it came.
 *
 * Dates go through `@/shared/lib/dates`, which reads the string rather than
 * the locale, so server and browser render the same text.
 */

const DASH = "—";

/** `NPR 1,250.00`. An amount that does not parse is shown as it came. */
export function formatMoney(amount?: string | null, currency?: string | null): string {
  if (amount == null || amount === "") return DASH;

  const n = Number(amount);
  const value = Number.isFinite(n)
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : amount;

  return currency ? `${currency} ${value}` : value;
}

/** `PER_KG` → `Per Kg`, `APPROVED_BY_CORPORATE` → `Approved By Corporate`. */
export function humanize(value?: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** `"Kathmandu, Bagmati, Nepal"` — blanks dropped. */
export function joinPlace(...parts: (string | null | undefined)[]): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}
