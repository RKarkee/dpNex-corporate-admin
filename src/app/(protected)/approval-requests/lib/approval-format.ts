import { formatDate, formatDateTime } from "@/shared/lib/dates";

import {
  infoFieldLabel,
  type ApprovalPayload,
  type ApprovalRequest,
} from "../types";

/**
 * Formatting for approval requests — amounts and the one-line summary of what
 * a request is actually asking for.
 *
 * The date helpers live in `shared/lib/dates` now that support tickets need the
 * same ones; they are re-exported here so this module stays the one import a
 * component in this slice needs.
 */

export { formatDate, formatDateTime };

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
