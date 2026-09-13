import type { AppNotification } from "../types";

/**
 * ENTITY → URL. The single place a notification learns where it points.
 *
 * Two rules, both inherited from the admin console's version of this file:
 *
 * 1. NOT EVERY ENTITY HAS A PAGE HERE. An unmapped type returns `null` and its
 *    row renders as plain, unclickable text with the entity named underneath.
 *    Guessing a URL just sends people to a 404 that reads as a broken
 *    notification rather than a screen this portal does not have.
 *
 * 2. THE KEY IS NORMALISED, NOT MATCHED LITERALLY. The same concept arrives as
 *    `support_ticket`, `SupportTicket` and `support-tickets` depending on which
 *    part of the backend emitted it. Casing, separators and a trailing plural
 *    are stripped before lookup.
 *
 * Add a mapping here and nowhere else — a second copy is how the bell and the
 * inbox end up disagreeing about where a row goes.
 */
const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  supportticket: (id) => `/support-tickets/${id}`,
  consignmentrequest: (id) => `/consignments/request/${id}`,
  consignment: (id) => `/consignments/admin/${id}`,
  consignmentadmin: (id) => `/consignments/admin/${id}`,
  pickuprequest: (id) => `/pickup-requests/${id}`,
  approvalrequest: (id) => `/approval-requests/${id}`,
  invoice: (id) => `/billing-accounts/${id}`,
  billingaccount: (id) => `/billing-accounts/${id}`,
  user: (id) => `/users/${id}`,
  role: (id) => `/roles/${id}`,
};

/**
 * `Support_Ticket`, `support-tickets` and `SupportTicket` all collapse to
 * `supportticket`.
 *
 * The trailing "s" is dropped only when what remains is still 4+ characters, so
 * a legitimately singular type ending in s is not mangled into nothing.
 */
function normaliseEntityType(value: string): string {
  const flat = value.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (flat.length > 4 && flat.endsWith("s")) return flat.slice(0, -1);
  return flat;
}

/**
 * The href a notification should open, or `null` when it points at nothing this
 * app can show.
 *
 * `entity_id` is checked as a real number: the API sends `null` for system-wide
 * events and `0` is never a valid record id, so both mean "no target".
 */
export function notificationHref(
  notification: Pick<AppNotification, "entity_type" | "entity_id">,
): string | null {
  const entityType = notification.entity_type;
  if (!entityType) return null;

  const id = Number(notification.entity_id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const builder = ENTITY_ROUTES[normaliseEntityType(entityType)];
  return builder ? builder(String(id)) : null;
}

/** True when clicking the row will navigate somewhere. */
export function isRoutable(
  notification: Pick<AppNotification, "entity_type" | "entity_id">,
): boolean {
  return notificationHref(notification) !== null;
}

/**
 * "Support ticket #11" — shown under the message so the target is identifiable
 * even when it is not clickable.
 */
export function entityLabel(
  notification: Pick<AppNotification, "entity_type" | "entity_id">,
): string | null {
  const entityType = notification.entity_type?.trim();
  if (!entityType) return null;

  const readable = entityType
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  const label = readable.charAt(0).toUpperCase() + readable.slice(1);

  return notification.entity_id ? `${label} #${notification.entity_id}` : label;
}
