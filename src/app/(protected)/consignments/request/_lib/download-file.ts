/**
 * Browser-side handling for fetched files — label PDFs here.
 *
 * A sibling of `billing-accounts/_lib/download-file.ts` rather than an import
 * of it, the same way the consignment billing tab keeps its own copy: each
 * feature owns its helpers, so none reaches into another's `_lib`.
 */

/** Saves a blob through a throwaway `<a download>` click. */
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

/**
 * Opens an empty tab *inside the click*, before the file is fetched.
 *
 * Browsers only allow `window.open` during the user's gesture; calling it after
 * an `await` is treated as a popup and blocked. The tab is filled by
 * `showBlobInTab` once the bytes arrive, or closed if the fetch fails.
 */
export function openPendingTab(): Window | null {
  return window.open("", "_blank");
}

/** Points a tab from `openPendingTab` at the file; falls back to a fresh tab. */
export function showBlobInTab(tab: Window | null, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  if (tab && !tab.closed) tab.location.href = url;
  else window.open(url, "_blank");
  // Long enough for the tab to load it; the URL is useless after that.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** A filesystem-safe file name from a value that may contain slashes or spaces. */
export function safeFileName(value: string, extension: string): string {
  const base = value.trim().replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${base || "download"}.${extension}`;
}

/** 882626 → "862 KB". */
export function formatFileSize(bytes?: number | null): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
