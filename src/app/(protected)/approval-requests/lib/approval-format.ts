import {
  infoFieldLabel,
  type ApprovalPayload,
  type ApprovalRequest,
} from "../types";

/**
 * Formatting for approval requests — amounts, timestamps, and the one-line
 * summary of what a request is actually asking for.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * `2026-09-12T10:10:57.000000Z` → `12 Sep 2026`.
 *
 * Read off the ISO string rather than through `toLocaleString`. These pages are
 * server-rendered and then hydrated, and a locale- or timezone-dependent format
 * produces different text on each side — React discards the whole subtree and
 * warns. Reading the characters gives the same answer everywhere.
 */
export function formatDate(value?: string | null): string {
  const iso = String(value ?? "").trim();
  if (iso.length < 10) return "—";

  const [year, month, day] = iso.slice(0, 10).split("-");
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return iso.slice(0, 10);

  return `${Number(day)} ${monthName} ${year}`;
}

/** The same, with the time of day. `—` when there is no timestamp at all. */
export function formatDateTime(value?: string | null): string {
  const iso = String(value ?? "").trim();
  if (iso.length < 10) return "—";

  const date = formatDate(iso);
  const time = iso.slice(11, 16);

  return time ? `${date}, ${time}` : date;
}

/** Thousands separators, and nothing else — the API sends no currency with these. */
export function formatAmount(value: unknown): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return String(value ?? "—");
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    amount,
  );
}

/**
 * A discount, as the reviewer needs to read it.
 *
 * The type is what gives the number meaning: `1500` is fifteen hundred rupees
 * or a nonsensical percentage, and rendering the bare number invites exactly
 * that confusion.
 */
export function formatDiscount(payload: ApprovalPayload): string {
  const type = String(payload.discount_type ?? "").toUpperCase();
  const value = formatAmount(payload.discount_value);

  if (type === "PERCENTAGE") return `${value}%`;
  if (type === "FIXED") return `${value} off`;
  return value;
}

/** The attribute keys an update request actually proposes to change. */
export function payloadKeys(payload?: ApprovalPayload | null): string[] {
  if (!payload) return [];
  return Object.keys(payload).filter((key) => payload[key] !== undefined);
}

/**
 * One line saying what this request asks for, for the table.
 *
 * The detail page renders the payload in full; this is the version that has to
 * survive a 200px column, so an update request is summarised by which fields
 * it touches rather than by their values.
 */
export function summarizePayload(request: ApprovalRequest): string {
  const payload = request.payload ?? {};
  const type = String(request.type).toUpperCase();

  if (type === "CREDIT_LIMIT_INCREASE") {
    return `New limit ${formatAmount(payload.credit_limit)}`;
  }

  if (type === "DISCOUNT") {
    const discount = formatDiscount(payload);
    return request.subject_id
      ? `${discount} · consignment #${request.subject_id}`
      : discount;
  }

  const keys = payloadKeys(payload);
  if (keys.length === 0) return "—";
  if (keys.length <= 2) return keys.map(infoFieldLabel).join(", ");

  return `${keys.slice(0, 2).map(infoFieldLabel).join(", ")} +${keys.length - 2} more`;
}
