/**
 * Formats a dashboard figure by the endpoint's own `format` hint
 * (`"integer" | "weight" | "currency"`) rather than guessing from the value.
 *
 * No currency code travels with this endpoint's response (unlike the billing
 * resources, which always carry one per invoice), so `"currency"` renders as
 * a plain thousands-grouped number with two decimals rather than guessing a
 * symbol — the tile's own label (\"Declared Value\", \"Billed\"…) already says
 * what it is.
 */
export function formatTileValue(value: number | string | null | undefined, format: string): string {
  if (value === null || value === undefined || value === "") return "—";

  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);

  if (format === "integer") {
    return Math.round(numeric).toLocaleString();
  }

  if (format === "currency") {
    return numeric.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (format === "weight") {
    return `${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
  }

  return numeric.toLocaleString();
}

/** A signed change figure (`+3`, `−2`), or `null` when there is nothing to compare against. */
export function formatTileChange(change: number | null | undefined, changePercent: number | null | undefined): string | null {
  if (typeof changePercent === "number" && Number.isFinite(changePercent)) {
    const sign = changePercent > 0 ? "+" : "";
    return `${sign}${changePercent.toLocaleString(undefined, { maximumFractionDigits: 1 })}% vs previous period`;
  }

  if (typeof change === "number" && Number.isFinite(change) && change !== 0) {
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toLocaleString()} vs previous period`;
  }

  return null;
}
