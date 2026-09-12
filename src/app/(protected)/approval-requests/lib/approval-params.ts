import type { ApprovalFilterValues } from "../types";
import { DEFAULT_APPROVAL_STATUS } from "../types";

/**
 * Filters and page, as they live in the URL.
 *
 * The URL is the single source of truth — no mirrored state to drift from it.
 * A refresh, a bookmark, a shared link and the Back button all restore the same
 * view, and the query key is derived straight from what is on screen. That
 * matters more here than on the other lists in this app: "look at
 * REQ-2026-000003" is a normal thing to say, and a filtered queue is a normal
 * thing to send someone.
 */

/**
 * The default view.
 *
 * PENDING rather than everything, matching `/meta`'s own
 * `approval_statuses.default` and the API's behaviour when `status` is omitted.
 * The bar says so in words, because a default filter nobody can see is a filter
 * they will forget is applied.
 */
export const DEFAULT_FILTERS: ApprovalFilterValues = {
  q: "",
  status: DEFAULT_APPROVAL_STATUS,
  type: "",
  corporate_id: "",
  customer_id: "",
  requested_from: "",
  requested_to: "",
  reviewed_from: "",
  reviewed_to: "",
};

/** On screen at all times. */
export const PRIMARY_KEYS = ["q", "status", "type"] as const;

/** Behind "More filters" — the count badge on that button is these. */
export const ADVANCED_KEYS = [
  "corporate_id",
  "customer_id",
  "requested_from",
  "requested_to",
  "reviewed_from",
  "reviewed_to",
] as const;

const ALL_KEYS = [...PRIMARY_KEYS, ...ADVANCED_KEYS] as const;

/**
 * "Any status", in the URL.
 *
 * Absence cannot mean it: an absent `status` is the PENDING default, so
 * clearing the status filter needs a value of its own. Anything else would
 * make "show me everything" unshareable — the link would come back filtered.
 */
export const ANY_STATUS = "ANY";

export interface ApprovalListState {
  filters: ApprovalFilterValues;
  page: number;
}

/** A date input's value, from whatever the API or a hand-edited URL carried. */
function readDate(value: string | null): string {
  if (!value) return "";
  // The API documents datetimes on the `*_to` bounds — keep the date half,
  // which is what the control can show and what the filter means anyway.
  return value.trim().slice(0, 10);
}

function readId(value: string | null): string {
  const trimmed = (value ?? "").trim();
  // The API requires at least 1; a `0` or a stray word would be rejected, so
  // drop it here rather than send a request that cannot match.
  return /^\d+$/.test(trimmed) && Number(trimmed) >= 1 ? trimmed : "";
}

/** Reads the view out of the URL, falling back to the default for anything absent. */
export function parseListState(
  searchParams: URLSearchParams | { get(key: string): string | null },
): ApprovalListState {
  const get = (key: string) => searchParams.get(key);

  const rawStatus = (get("status") ?? "").trim().toUpperCase();
  const status =
    rawStatus === ANY_STATUS
      ? ""
      : rawStatus || DEFAULT_FILTERS.status;

  const page = Number.parseInt(get("page") ?? "1", 10);

  return {
    filters: {
      q: (get("q") ?? "").slice(0, 60),
      status,
      type: (get("type") ?? "").trim().toUpperCase(),
      corporate_id: readId(get("corporate_id")),
      customer_id: readId(get("customer_id")),
      requested_from: readDate(get("requested_from")),
      requested_to: readDate(get("requested_to")),
      reviewed_from: readDate(get("reviewed_from")),
      reviewed_to: readDate(get("reviewed_to")),
    },
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** The query string for a view — defaults omitted, so a clean view has a clean URL. */
export function buildListQuery({ filters, page }: ApprovalListState): string {
  const params = new URLSearchParams();

  for (const key of ALL_KEYS) {
    const value = filters[key].trim();

    if (key === "status") {
      // Three distinct states, two of which are not just "a value":
      // the default (omit), any status (sentinel), a specific status (write it).
      if (value === "") params.set("status", ANY_STATUS);
      else if (value !== DEFAULT_FILTERS.status) params.set("status", value);
      continue;
    }

    if (value) params.set(key, value);
  }

  if (page > 1) params.set("page", String(page));

  return params.toString();
}

/** How many filters differ from the default view. */
export function countActiveFilters(filters: ApprovalFilterValues): number {
  return ALL_KEYS.reduce(
    (count, key) =>
      filters[key].trim() !== DEFAULT_FILTERS[key] ? count + 1 : count,
    0,
  );
}

/** How many of them are hidden behind "More filters". */
export function countAdvancedFilters(filters: ApprovalFilterValues): number {
  return ADVANCED_KEYS.reduce(
    (count, key) => (filters[key].trim() ? count + 1 : count),
    0,
  );
}

export function hasActiveFilters(filters: ApprovalFilterValues): boolean {
  return countActiveFilters(filters) > 0;
}

/**
 * Is this the untouched default view?
 *
 * Used to choose between "no requests yet" and "nothing matches" — telling
 * someone to raise their first request when fifty exist behind a filter is the
 * kind of wrong that makes a page look broken.
 */
export function isDefaultView(filters: ApprovalFilterValues): boolean {
  return countActiveFilters(filters) === 0;
}
