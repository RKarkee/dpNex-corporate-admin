/**
 * Saves a blob to disk via a throwaway `<a download>` click.
 *
 * Standalone sibling of `billing-accounts/_lib/download-file.ts` — see that
 * file for why the object URL is revoked immediately rather than kept as a
 * stored `src`.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

/** A filesystem-safe file name from a value that may contain slashes or spaces. */
export function safeFileName(value: string, extension: string): string {
  const base = value.trim().replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${base || "download"}.${extension}`;
}
