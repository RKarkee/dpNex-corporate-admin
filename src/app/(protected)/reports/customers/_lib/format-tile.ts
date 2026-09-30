export function formatTileValue(value: number | string | null | undefined, format: string): string {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);
  if (format === "integer") return Math.round(numeric).toLocaleString();
  if (format === "currency") return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (format === "weight") return `${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
  return numeric.toLocaleString();
}

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
