/**
 * Amount formatting for API decimals.
 *
 * The API sends money as fixed-scale strings (`"551.0000"`). The locale is
 * pinned to `en-US` so the server render and the hydrated client produce the
 * same text — the same reason `dates.ts` avoids `toLocaleString`.
 */

const AMOUNT_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

/** Thousands separators, and nothing else — no currency is added. */
export function formatAmount(value: unknown): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return String(value ?? "—");
  }

  return AMOUNT_FORMAT.format(amount);
}

/**
 * `"551.0000"` → `551`, and anything unparseable → `null`.
 *
 * `null` is kept distinct from `0`: the API sends `available_credit: null`
 * when it has not computed one, which is not the same as "nothing available".
 */
export function parseDecimal(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
