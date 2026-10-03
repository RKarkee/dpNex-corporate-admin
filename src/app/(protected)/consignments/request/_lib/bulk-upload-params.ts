import type { ReadonlyURLSearchParams } from "next/navigation";

/**
 * The Bulk Upload tab's uploads list, as URL state.
 *
 * The URL is the source of truth for the list's filters, page and page size —
 * a refresh, a bookmark or a shared link reopens the same view. Every key is
 * prefixed `bu_` so it never collides with `tab`, `batch` or anything else in
 * the same query string, and every value is validated on the way in.
 *
 * No portal, "only mine" or "uploaded by": a corporate caller only ever sees
 * its own portal's uploads, so those filters narrow nothing here.
 */

/** Where an upload is — the documented `status` values. */
export const BULK_UPLOAD_STATUSES = [
  "PENDING",
  "VALIDATING",
  "VALIDATION_FAILED",
  "PROCESSING",
  "COMPLETED",
  "COMPLETED_WITH_ERRORS",
  "FAILED",
] as const;

export const BULK_UPLOAD_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
export const BULK_UPLOAD_DEFAULT_PER_PAGE = 10;

export interface BulkUploadFilterValues {
  /** Batch code or file name; max 60. */
  search: string;
  status: string;
  /** "true" | "false" | "" */
  is_finished: string;
  /** "true" | "false" | "" */
  has_errors: string;
  /** yyyy-mm-dd, or "". */
  created_from: string;
  created_to: string;
}

export const EMPTY_BULK_UPLOAD_FILTERS: BulkUploadFilterValues = {
  search: "",
  status: "",
  is_finished: "",
  has_errors: "",
  created_from: "",
  created_to: "",
};

export interface BulkUploadListState {
  filters: BulkUploadFilterValues;
  page: number;
  perPage: number;
}

/** filter key → URL key. */
const URL_KEYS: Record<keyof BulkUploadFilterValues, string> = {
  search: "bu_search",
  status: "bu_status",
  is_finished: "bu_finished",
  has_errors: "bu_errors",
  created_from: "bu_from",
  created_to: "bu_to",
};
const PAGE_KEY = "bu_page";
const PER_PAGE_KEY = "bu_per_page";

/** Every URL key this list owns — dropped when leaving the tab. */
export const BULK_UPLOAD_URL_KEYS: readonly string[] = [
  ...Object.values(URL_KEYS),
  PAGE_KEY,
  PER_PAGE_KEY,
];

/* ── readers ─────────────────────────────────────────────────────────── */

function readInt(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readText(raw: string | null, maxLength: number): string {
  const value = (raw ?? "").trim();
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function readStatus(raw: string | null): string {
  const value = (raw ?? "").trim().toUpperCase();
  return (BULK_UPLOAD_STATUSES as readonly string[]).includes(value) ? value : "";
}

function readBool(raw: string | null): string {
  if (raw === "true" || raw === "1") return "true";
  if (raw === "false" || raw === "0") return "false";
  return "";
}

function readDate(raw: string | null): string {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(new Date(raw).getTime()) ? raw : "";
}

export function parseBulkUploadListState(
  searchParams: ReadonlyURLSearchParams | URLSearchParams | null,
): BulkUploadListState {
  const get = (key: string) => searchParams?.get(key) ?? null;
  const perPage = readInt(get(PER_PAGE_KEY));

  const filters: BulkUploadFilterValues = {
    search: readText(get(URL_KEYS.search), 60),
    status: readStatus(get(URL_KEYS.status)),
    is_finished: readBool(get(URL_KEYS.is_finished)),
    has_errors: readBool(get(URL_KEYS.has_errors)),
    created_from: readDate(get(URL_KEYS.created_from)),
    created_to: readDate(get(URL_KEYS.created_to)),
  };
  // A "to" before the "from" is a range the API rejects — drop the "to".
  if (filters.created_from && filters.created_to && filters.created_to < filters.created_from) {
    filters.created_to = "";
  }

  return {
    filters,
    page: readInt(get(PAGE_KEY)) ?? 1,
    perPage:
      perPage && (BULK_UPLOAD_PER_PAGE_OPTIONS as readonly number[]).includes(perPage)
        ? perPage
        : BULK_UPLOAD_DEFAULT_PER_PAGE,
  };
}

/**
 * Writes the list state into `query` (in place), leaving every other key —
 * `tab`, `batch`, … — alone. Defaults are left off so the URL stays short.
 */
export function writeBulkUploadListState(
  query: URLSearchParams,
  state: BulkUploadListState,
): URLSearchParams {
  for (const key of BULK_UPLOAD_URL_KEYS) query.delete(key);
  for (const [field, urlKey] of Object.entries(URL_KEYS) as [keyof BulkUploadFilterValues, string][]) {
    const value = state.filters[field].trim();
    if (value) query.set(urlKey, value);
  }
  if (state.page > 1) query.set(PAGE_KEY, String(state.page));
  if (state.perPage !== BULK_UPLOAD_DEFAULT_PER_PAGE) query.set(PER_PAGE_KEY, String(state.perPage));
  return query;
}

/** How many filters are applied — for the badge on the bar. */
export function countBulkUploadFilters(filters: BulkUploadFilterValues): number {
  return Object.values(filters).filter((value) => value.trim() !== "").length;
}

/** The ones that live in the "More filters" panel. */
export function countAdvancedBulkUploadFilters(filters: BulkUploadFilterValues): number {
  return [filters.has_errors, filters.created_from, filters.created_to].filter(
    (value) => value.trim() !== "",
  ).length;
}
