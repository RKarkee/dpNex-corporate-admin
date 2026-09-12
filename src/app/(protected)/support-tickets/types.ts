/**
 * Support tickets — a question or complaint the caller raised, and where it
 * has got to.
 *
 * Scope is applied by the API before any filter: a corporate caller sees only
 * their own tickets, so naming another corporate narrows that set rather than
 * reaching outside it. Nothing in this slice tries to enforce that a second
 * time; it only has to not pretend otherwise in the copy.
 */

export const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = [
  "GENERAL",
  "BILLING",
  "DELIVERY",
  "PICKUP",
  "TRACKING",
  "RATES",
  "TECHNICAL",
  "COMPLAINT",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/** `/meta` defaults for a new ticket. */
export const DEFAULT_TICKET_CATEGORY: TicketCategory = "GENERAL";
export const DEFAULT_TICKET_PRIORITY: TicketPriority = "MEDIUM";

/**
 * One message on a ticket.
 *
 * `is_internal` is the whole difference between a note only staff can read and
 * a message the customer sees, and there is no endpoint to correct it
 * afterwards. The server is what enforces it — the flag is honoured only for
 * internal callers — so the composer offers both modes and the thread renders
 * each message with the audience it actually came back with.
 *
 * `author_name` comes back null even when `user_id` is set, the same nulled-name
 * pattern as `raised_by_name` and `assigned_to_name`.
 */
export interface SupportTicketReply {
  id: number;
  message?: string | null;
  is_internal?: boolean | null;
  user_id?: number | null;
  author_name?: string | null;
  created_at?: string | null;
}

export interface SupportTicket {
  id: number;
  ticket_no: string;
  subject: string;
  description?: string | null;
  category?: TicketCategory | string | null;
  priority?: TicketPriority | string | null;
  status: TicketStatus | string;
  /** The server's own wording. Preferred over anything derived locally. */
  status_label?: string | null;
  is_open?: boolean | null;

  consignment_id?: number | null;
  tracking_no?: string | null;
  corporate_id?: number | null;
  customer_id?: number | null;

  raised_by?: number | null;
  raised_by_name?: string | null;
  assigned_to?: number | null;
  assigned_to_name?: string | null;
  assigned_at?: string | null;

  /**
   * The workflow's own bookkeeping. Carried on the type so nothing is lost,
   * but deliberately not driven from this portal — see the phase doc.
   */
  last_event_code?: string | null;
  last_event_at?: string | null;
  next_allowed_events?: string[] | null;

  first_responded_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  resolution?: string | null;

  /** The detail endpoint returns the conversation inline; the list does not. */
  replies?: SupportTicketReply[] | null;

  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Is closing offered?
 *
 * Only that it is not already closed — the same rule the admin console applies.
 * Closing is a separate endpoint with no published precondition this app can
 * read, and the API's refusal ("Only a resolved ticket can be closed.") is a
 * server-side rule that may differ by caller and by workflow state. Encoding it
 * here as a disabled button hid the action behind a rule this app only guessed
 * at, which reads as a missing feature rather than as a rule.
 *
 * So the button is offered, the dialog says when there is no resolution on
 * record, and the server has the last word — with its own sentence shown in
 * place if it refuses.
 */
export function isClosable(ticket: SupportTicket): boolean {
  if (ticket.closed_at) return false;
  return String(ticket.status).toUpperCase() !== "CLOSED";
}

/** Has a resolution been recorded? Decides the wording of the close dialog. */
export function isResolved(ticket: SupportTicket): boolean {
  if (ticket.resolved_at) return true;
  return String(ticket.status).toUpperCase() === "RESOLVED";
}

/** Nobody has picked it up. Surfaced at the top of the detail page. */
export function isUnassigned(ticket: SupportTicket): boolean {
  return !ticket.assigned_to;
}

/** Opened, and nobody has replied yet. */
export function isAwaitingFirstResponse(ticket: SupportTicket): boolean {
  if (ticket.first_responded_at) return false;
  const status = String(ticket.status).toUpperCase();
  return status !== "CLOSED" && status !== "RESOLVED";
}

/**
 * A closed ticket takes no more replies — the conversation is over, and the
 * answer to a new problem is a new ticket. A RESOLVED one deliberately still
 * does: that window is the customer's chance to disagree, which is the whole
 * reason resolving and closing are separate.
 */
export function acceptsReplies(ticket: SupportTicket): boolean {
  return String(ticket.status).toUpperCase() !== "CLOSED";
}

/** Every query parameter the list endpoint documents, as strings. */
export interface TicketFilterValues {
  q: string;
  ticket_no: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  assigned_to: string;
  /** `Y` or empty — a flag, not a boolean. */
  unassigned: string;
  raised_by: string;
  corporate_id: string;
  customer_id: string;
  consignment_id: string;
  /** `Y` or empty. Anything not RESOLVED or CLOSED. */
  open: string;
  /** `true` / `false` / empty. */
  resolved: string;
  has_consignment: string;
  awaiting_first_response: string;
  created_from: string;
  created_to: string;
  resolved_from: string;
  resolved_to: string;
}
