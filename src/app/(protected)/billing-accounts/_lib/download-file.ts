/**
 * Saves a blob to disk via a throwaway `<a download>` click.
 *
 * A one-shot action, not a stored `src` — unlike `useFileUrl`'s `data:`-URL
 * choice for images (see `file.service.ts` for why that one avoids
 * `URL.createObjectURL`), the object URL here is revoked the instant the
 * click fires, so there is nothing left for a re-render — or React's effect
 * double-invoke in development — to race against.
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
