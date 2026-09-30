/**
 * Saves a blob to disk via a throwaway `<a download>` click.
 *
 * A one-shot action, not a stored `src`: the object URL is revoked the
 * instant the click fires, so there is nothing left for a re-render to race
 * against. Duplicated from `billing-accounts/_lib/download-file.ts` per this
 * codebase's convention of not sharing small helpers across distinct feature
 * modules.
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

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "text/csv": "csv",
  "application/csv": "csv",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/json": "json",
};

/**
 * The file name the server suggested, read off `Content-Disposition`
 * (`attachment; filename="billing-2026-09.xlsx"` or the RFC 5987
 * `filename*=UTF-8''...` form). Returns `null` when the header is absent or
 * unparseable, so the caller can fall back to a name it builds itself.
 */
export function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

  const starMatch = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (starMatch?.[1]) {
    try {
      return decodeURIComponent(starMatch[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // Fall through to the plain form below.
    }
  }

  const plainMatch = /filename="?([^";]+)"?/i.exec(header);
  return plainMatch?.[1]?.trim() || null;
}

/** A best-guess file extension from the response's `Content-Type`, for when no filename is given. */
export function extensionFromContentType(contentType: string | null): string {
  if (!contentType) return "xlsx";
  const bare = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return EXTENSION_BY_CONTENT_TYPE[bare] ?? "xlsx";
}
