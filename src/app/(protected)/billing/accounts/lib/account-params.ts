import {
  BILLING_ACCOUNT_STATUSES,
  type BillingAccountFilterValues,
} from "../types";

/**
 * Filters and page, as they live in the URL.
 *
 * Same contract as the support-ticket and approval lists: the query string is
 * the single source of truth, so a refresh, a bookmark, a shared link and the
 * Back button all restore the same view. Everything defaults to empty, and
 * absence means "not filtering by this".
 */

export const DEFAULT_FILTERS: BillingAccountFilterValues = {
  search: "",
  billing_account_code: "",
  account_name: "",
  pan: "",
  vat: "",
  status: "",
  is_primary: "",
  country: "",
  city: "",
  created_from: "",
  created_to: "",
};

/** On screen at all times. */
export const PRIMARY_KEYS = ["search", "status", "is_primary"] as const;

/** Behind "More filters" — the count badge on that button is these. */
export const ADVANCED_KEYS = [
  "billing_account_code",
  "account_name",
  "pan",
  "vat",
  "country",
  "city",
  "created_from",
  "created_to",
] as const;

export const ALL_KEYS = [...PRIMARY_KEYS, ...ADVANCED_KEYS] as const;

/** The API's documented maximum lengths, applied to inputs and to the URL. */
export const MAX_LENGTH = {
  search: 60,
  billing_account_code: 30,
  account_name: 60,
  pan: 30,
  vat: 30,
  city: 30,
} as const;

/** Rows per page. 15 is the API's own default; it allows 1–100. */
export const PER_PAGE_OPTIONS = [15, 25, 50, 100] as const;
export const DEFAULT_PER_PAGE = 15;

export interface BillingAccountListState {
  filters: BillingAccountFilterValues;
  page: number;
  perPage: number;
}

function readText(value: string | null, max: number): string {
  return (value ?? "").slice(0, max);
}

function readStatus(value: string | null): string {
  const upper = (value ?? "").trim().toUpperCase();
  // A hand-edited URL naming a state the API would reject is dropped rather
  // than sent — a 422 on page load is a worse answer than no filter.
  return (BILLING_ACCOUNT_STATUSES as readonly string[]).includes(upper)
    ? upper
    : "";
}

function readBool(value: string | null): string {
  const trimmed = (value ?? "").trim().toLowerCase();
  return trimmed === "true" || trimmed === "false" ? trimmed : "";
}

function readCountry(value: string | null): string {
  const upper = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : "";
}

function readDate(value: string | null): string {
  // The API takes a datetime on `created_to`; the date half is what the
  // control shows and what the filter means.
  return (value ?? "").trim().slice(0, 10);
}

export function parseListState(
  searchParams: URLSearchParams | { get(key: string): string | null },
): BillingAccountListState {
  const get = (key: string) => searchParams.get(key);
  const page = Number.parseInt(get("page") ?? "1", 10);
  const perPage = Number.parseInt(get("per_page") ?? "", 10);

  return {
    filters: {
      search: readText(get("search"), MAX_LENGTH.search),
      billing_account_code: readText(
        get("billing_account_code"),
        MAX_LENGTH.billing_account_code,
      ),
      account_name: readText(get("account_name"), MAX_LENGTH.account_name),
      pan: readText(get("pan"), MAX_LENGTH.pan),
      vat: readText(get("vat"), MAX_LENGTH.vat),
      status: readStatus(get("status")),
      is_primary: readBool(get("is_primary")),
      country: readCountry(get("country")),
      city: readText(get("city"), MAX_LENGTH.city),
      created_from: readDate(get("created_from")),
      created_to: readDate(get("created_to")),
    },
    page: Number.isFinite(page) && page > 0 ? page : 1,
    // Only the sizes the selector offers, so a hand-edited URL cannot leave
    // the control showing a value it has no option for.
    perPage: (PER_PAGE_OPTIONS as readonly number[]).includes(perPage)
      ? perPage
      : DEFAULT_PER_PAGE,
  };
}

export function buildListQuery({ filters, page, perPage }: BillingAccountListState): string {
  const params = new URLSearchParams();

  for (const key of ALL_KEYS) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }

  if (page > 1) params.set("page", String(page));
  if (perPage !== DEFAULT_PER_PAGE) params.set("per_page", String(perPage));

  return params.toString();
}

function countKeys(
  filters: BillingAccountFilterValues,
  keys: readonly (keyof BillingAccountFilterValues)[],
): number {
  return keys.reduce((count, key) => (filters[key].trim() ? count + 1 : count), 0);
}

export function countActiveFilters(filters: BillingAccountFilterValues): number {
  return countKeys(filters, ALL_KEYS);
}

export function countAdvancedFilters(filters: BillingAccountFilterValues): number {
  return countKeys(filters, ADVANCED_KEYS);
}

export function hasActiveFilters(filters: BillingAccountFilterValues): boolean {
  return countActiveFilters(filters) > 0;
}
