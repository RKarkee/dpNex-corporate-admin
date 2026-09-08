/**
 * Convert a 2D row matrix into a CSV blob and trigger a download.
 *
 * Cells are escaped according to RFC 4180 so commas, quotes, and newlines
 * stay intact when exported from statement tables.
 */
export function downloadCsv(rows: (string | number | null)[][], filename: string): void {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          if (value === null) return "";
          const text = String(value);
          return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    )
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}