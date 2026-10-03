/**
 * Shared display helpers for the bulk-upload views. The batch and row shapes
 * aren't pinned down yet, so both views render whatever fields arrive and lean
 * on these for labels, values and status colours.
 */

export function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Tone classes for a status badge — green done, red failed, amber partial, blue working. */
const STATUS_TONE: Record<string, string> = {
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DONE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CREATED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  IMPORTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  VALID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  ERROR: "border-red-200 bg-red-50 text-red-700",
  INVALID: "border-red-200 bg-red-50 text-red-700",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-700",
  PARTIALLY_COMPLETED: "border-amber-200 bg-amber-50 text-amber-700",
  PROCESSING: "border-blue-200 bg-blue-50 text-blue-700",
  QUEUED: "border-blue-200 bg-blue-50 text-blue-700",
  PENDING: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  RUNNING: "border-blue-200 bg-blue-50 text-blue-700",
};

export function statusTone(status: string): string {
  return STATUS_TONE[status.toUpperCase()] ?? "text-foreground";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** A plain value as text: blanks as "—", booleans as Yes/No, ISO timestamps formatted. */
export function formatPlainValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  return String(value);
}

/**
 * Any value as text, including the nested shapes rows carry —
 * `errors: { field: ["msg"] }` → "field: msg".
 */
export function formatAnyValue(value: unknown): string {
  if (Array.isArray(value)) {
    const parts = value.map((v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)));
    return parts.length ? parts.join("; ") : "—";
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, v]) => {
        const text = Array.isArray(v) ? v.join(", ") : typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
        return `${key}: ${text}`;
      })
      .join("; ");
  }
  return formatPlainValue(value);
}
