export function formatTileValue(value: number | string | null | undefined, format: string): string {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);
  if (format === "integer") return Math.round(numeric).toLocaleString();
  if (format === "currency") return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (format === "weight") return `${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
  if (format === "percent") return `${numeric.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  return numeric.toLocaleString();
}
