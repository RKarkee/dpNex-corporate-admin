import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketFilterValues,
} from "../types";

/**
 * Filters and page, as they live in the URL.
 *
 * Same contract as the approval-request list: the query string is the single
 * source of truth, so a refresh, a bookmark, a shared link and the Back button
 * all restore the same view. With twenty filters that matters more, not less —
 * a queue someone has narrowed by hand is worth being able to send.
 *
 * Everything defaults to empty. Unlike approvals there is no server-side
 * default status to mirror, so absence means "not filtering by this" for every
 * key and no sentinel value is needed.
 */

export const DEFAULT_FILTERS: TicketFilterValues = {
  q: "",
  ticket_no: "",
  subject: "",
  status: "",
  priority: "",
  category: "",
  assigned_to: "",
  unassigned: "",
  raised_by: "",
  corporate_id: "",
  customer_id: "",
  consignment_id: "",
  open: "",
  resolved: "",
  has_consignment: "",
  awaiting_first_response: "",
  created_from: "",
  created_to: "",
  resolved_from: "",
  resolved_to: "",
};

/** On screen at all times — what someone opens this page to ask. */
export const PRIMARY_KEYS = ["q", "status", "priority", "category"] as const;

/** Behind "More filters" — the count badge on that button is these. */
export const ADVANCED_KEYS = [
  "ticket_no",
  "subject",
  "assigned_to",
  "unassigned",
  "raised_by",
  "corporate_id",
  "customer_id",
  "consignment_id",
  "open",
  "resolved",
  "has_consignment",
  "awaiting_first_response",
  "created_from",
  "created_to",
  "resolved_from",
  "resolved_to",
] as const;

const ALL_KEYS = [...PRIMARY_KEYS, ...ADVANCED_KEYS] as const;

export interface TicketListState {
  filters: TicketFilterValues;
  page: number;
}

function readEnum(value: string | null, allowed: readonly string[]): string {
  const upper = (value ?? "").trim().toUpperCase();
  // A hand-edited or stale URL naming a status the API would reject is dropped
  // rather than sent — a 422 on page load is a worse answer than no filter.
  return allowed.includes(upper) ? upper : "";
}

function readId(value: string | null): string {
  const trimmed = (value ?? "").trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) >= 1 ? trimmed : "";
}

function readDate(value: string | null): string {
  // The API documents datetimes on the `*_to` bounds; the date half is what the
  // control shows and what the filter means, since both ends compare on DATE.
  return (value ?? "").trim().slice(0, 10);
}

function readFlag(value: string | null): string {
  return (value ?? "").trim().toUpperCase() === "Y" ? "Y" : "";
}

function readBool(value: string | null): string {
  const trimmed = (value ?? "").trim().toLowerCase();
  return trimmed === "true" || trimmed === "false" ? trimmed : "";
}

export function parseListState(
  searchParams: URLSearchParams | { get(key: string): string | null },
): TicketListState {
  const get = (key: string) => searchParams.get(key);
  const page = Number.parseInt(get("page") ?? "1", 10);

  return {
    filters: {
      q: (get("q") ?? "").slice(0, 60),
      ticket_no: (get("ticket_no") ?? "").slice(0, 40),
      subject: (get("subject") ?? "").slice(0, 100),
      status: readEnum(get("status"), TICKET_STATUSES),
      priority: readEnum(get("priority"), TICKET_PRIORITIES),
      category: readEnum(get("category"), TICKET_CATEGORIES),
      assigned_to: readId(get("assigned_to")),
      unassigned: readFlag(get("unassigned")),
      raised_by: readId(get("raised_by")),
      corporate_id: readId(get("corporate_id")),
      customer_id: readId(get("customer_id")),
      consignment_id: readId(get("consignment_id")),
      open: readFlag(get("open")),
      resolved: readBool(get("resolved")),
      has_consignment: readBool(get("has_consignment")),
      awaiting_first_response: readBool(get("awaiting_first_response")),
      created_from: readDate(get("created_from")),
      created_to: readDate(get("created_to")),
      resolved_from: readDate(get("resolved_from")),
      resolved_to: readDate(get("resolved_to")),
    },
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function buildListQuery({ filters, page }: TicketListState): string {
  const params = new URLSearchParams();

  for (const key of ALL_KEYS) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }

  if (page > 1) params.set("page", String(page));

  return params.toString();
}

export function countActiveFilters(filters: TicketFilterValues): number {
  return ALL_KEYS.reduce(
    (count, key) => (filters[key].trim() ? count + 1 : count),
    0,
  );
}

export function countAdvancedFilters(filters: TicketFilterValues): number {
  return ADVANCED_KEYS.reduce(
    (count, key) => (filters[key].trim() ? count + 1 : count),
    0,
  );
}

export function hasActiveFilters(filters: TicketFilterValues): boolean {
  return countActiveFilters(filters) > 0;
}

/* -------------------------------------------------------------------------- */
/* Contradictions                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Filter pairs that cannot both be true, resolved as the user picks.
 *
 * Each of these is reachable in two clicks and then inexplicable: the list
 * comes back empty for a filter set that looks perfectly reasonable, and
 * nothing on screen says which half is at fault. Dropping the older half is
 * the recoverable direction — the user's most recent click is the one they
 * meant.
 */

/** A ticket cannot be owned by someone AND unassigned. */
export function withAssignedTo(
  filters: TicketFilterValues,
  next: string,
): TicketFilterValues {
  return {
    ...filters,
    assigned_to: next,
    unassigned: next ? "" : filters.unassigned,
  };
}

export function withUnassigned(
  filters: TicketFilterValues,
  next: string,
): TicketFilterValues {
  return {
    ...filters,
    unassigned: next,
    assigned_to: next ? "" : filters.assigned_to,
  };
}

/**
 * `open=Y` means "not RESOLVED or CLOSED", so it contradicts both a resolved
 * filter and either of those two statuses — by definition, not by convention.
 */
export function withOpen(
  filters: TicketFilterValues,
  next: string,
): TicketFilterValues {
  if (!next) return { ...filters, open: next };

  return {
    ...filters,
    open: next,
    resolved: filters.resolved === "true" ? "" : filters.resolved,
    status:
      filters.status === "RESOLVED" || filters.status === "CLOSED"
        ? ""
        : filters.status,
  };
}

export function withResolved(
  filters: TicketFilterValues,
  next: string,
): TicketFilterValues {
  return {
    ...filters,
    resolved: next,
    open: next === "true" ? "" : filters.open,
  };
}

export function withStatus(
  filters: TicketFilterValues,
  next: string,
): TicketFilterValues {
  const closedOff = next === "RESOLVED" || next === "CLOSED";
  return {
    ...filters,
    status: next,
    open: closedOff ? "" : filters.open,
  };
}

/** A ticket cannot be about one shipment AND about no shipment. */
export function withConsignment(
  filters: TicketFilterValues,
  next: string,
): TicketFilterValues {
  return {
    ...filters,
    consignment_id: next,
    has_consignment:
      next && filters.has_consignment === "false" ? "" : filters.has_consignment,
  };
}

export function withHasConsignment(
  filters: TicketFilterValues,
  next: string,
): TicketFilterValues {
  return {
    ...filters,
    has_consignment: next,
    consignment_id: next === "false" ? "" : filters.consignment_id,
  };
}
