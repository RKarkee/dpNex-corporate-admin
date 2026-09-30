import { downloadBlob } from "./download-file";

/**
 * A minimal CSV writer: quotes a cell only when it contains a comma, quote or
 * newline, doubling any quotes inside it — the one escaping rule CSV needs.
 */
function toCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  // `\r\n`: Excel opens an `\n`-only CSV fine, but a `\r\n` one is what it
  // itself would have written, which is the safer target for a file someone
  // is about to double-click.
  return rows.map((row) => row.map(toCell).join(",")).join("\r\n");
}

/** Builds a CSV in memory and hands it straight to the browser's save dialog. */
export function downloadCsv(rows: (string | number | null | undefined)[][], filename: string): void {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}
