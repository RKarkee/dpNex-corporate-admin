import { privateApiClient } from "@/shared/api/private-client";

/**
 * The `get-lists` reference endpoints — package types, materials, HS codes,
 * currencies, manufacturers.
 *
 * Distinct from `/meta` in two ways that decide how they are consumed:
 * these run to thousands of rows, and they are searched and paged server-side.
 * So `/meta` is fetched once and cached for an hour behind a plain select,
 * while these sit behind `AsyncCombobox`, which pages as the user scrolls.
 *
 * They are corporate-agnostic — no `/corporate` prefix — but still
 * authenticated, hence the private client.
 *
 * The search parameter is **not** uniform: currencies want `query`, every
 * other list wants `q`. Passing the wrong one returns an unfiltered page and
 * looks like a broken search, so each wrapper hardcodes its own.
 */

export interface LookupOption {
  value: string | number;
  label: string;
}

export interface LookupListMeta {
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface LookupListResult {
  data: LookupOption[];
  meta: LookupListMeta;
}

const PATHS = {
  packageTypes: "/packagetypes/get-lists",
  materials: "/materials/get-lists",
  hsCodes: "/hscodes/get-lists",
  currencies: "/currencies/get-lists",
  manufacturers: "/manufacturers/get-lists",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * These endpoints answer `{ data, meta }` without the usual `status` wrapper,
 * so the client's envelope-peeling leaves the whole body — read both keys off
 * whichever level they turn up at.
 */
function readList(raw: unknown, page: number, perPage: number): LookupListResult {
  const body = isRecord(raw) ? raw : {};
  const nested = isRecord(body.data) ? body.data : undefined;

  const rows = Array.isArray(body.data)
    ? body.data
    : nested && Array.isArray(nested.data)
      ? nested.data
      : [];

  const metaSource = isRecord(body.meta)
    ? body.meta
    : nested && isRecord(nested.meta)
      ? nested.meta
      : {};

  return {
    data: rows as LookupOption[],
    meta: {
      page: typeof metaSource.page === "number" ? metaSource.page : page,
      per_page:
        typeof metaSource.per_page === "number" ? metaSource.per_page : perPage,
      // Absent means "this was the last page" — the safe read, since assuming
      // more would make the combobox request pages that do not exist.
      has_more: metaSource.has_more === true,
    },
  };
}

async function fetchLookup(
  path: string,
  page: number,
  perPage: number,
  query: string | undefined,
  queryParam: "q" | "query",
  signal?: AbortSignal,
): Promise<LookupListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    path,
    undefined,
    {
      params: {
        page,
        per_page: perPage,
        ...(query ? { [queryParam]: query } : {}),
      },
      // The combobox shows "no results" in place; a toast per keystroke would
      // be unusable.
      silent: true,
      signal,
    },
  );

  return readList(response.raw, page, perPage);
}

export function fetchPackageTypes(page: number, perPage: number, query?: string) {
  return fetchLookup(PATHS.packageTypes, page, perPage, query, "q");
}

export function fetchMaterials(page: number, perPage: number, query?: string) {
  return fetchLookup(PATHS.materials, page, perPage, query, "q");
}

export function fetchHsCodes(page: number, perPage: number, query?: string) {
  return fetchLookup(PATHS.hsCodes, page, perPage, query, "q");
}

/** The one list that keys its search as `query` rather than `q`. */
export function fetchCurrencies(page: number, perPage: number, query?: string) {
  return fetchLookup(PATHS.currencies, page, perPage, query, "query");
}

export function fetchManufacturers(page: number, perPage: number, query?: string) {
  return fetchLookup(PATHS.manufacturers, page, perPage, query, "q");
}
