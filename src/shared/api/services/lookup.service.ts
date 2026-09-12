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
  forwarders: "/forwarders/get-lists",
  corporates: "/corporates/get-lists",
  customers: "/customers/get-lists",
  consignments: "/consignments/get-lists",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * These endpoints answer `{ data, meta }` without the usual `status` wrapper,
 * so the client's envelope-peeling leaves the whole body — read both keys off
 * whichever level they turn up at.
 */
/**
 * One row, however this endpoint keys its identifier.
 *
 * `/customers/get-lists` and `/corporates/get-lists` answer `{ id, label }`;
 * every other list answers `{ value, label }`. Reading whichever is present
 * keeps a single option contract for the combobox — casting the raw row
 * instead would hand it `value: undefined`, and selecting an option would
 * store nothing at all.
 *
 * A row with neither key is dropped rather than rendered, since an option that
 * cannot be selected is worse than one that is not offered.
 */
function toOption(row: unknown): LookupOption | null {
  if (!isRecord(row)) return null;

  const raw = row.value ?? row.id;
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string" && typeof raw !== "number") return null;

  return {
    value: raw,
    label: typeof row.label === "string" && row.label.trim() ? row.label : String(raw),
  };
}

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
    data: rows.map(toOption).filter((option): option is LookupOption => option !== null),
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

/**
 * Onward carriers, for the `forwarder_code` a tracking location can carry.
 *
 * Same `{ data, meta }` shape as the rest, searched with `q`.
 */
export function fetchForwarders(page: number, perPage: number, query?: string) {
  return fetchLookup(PATHS.forwarders, page, perPage, query, "q");
}

/**
 * Corporates, customers and consignments — the three lists the approval-request
 * filters and the discount subject picker search over.
 *
 * All three are ids rather than codes, and all three answer `{ id | value,
 * label }` with the usual `meta.has_more`, so `toOption` above is what makes
 * them interchangeable with the code-keyed lists.
 */
export function fetchCorporates(page: number, perPage: number, query?: string) {
  return fetchLookup(PATHS.corporates, page, perPage, query, "q");
}

export function fetchCustomers(page: number, perPage: number, query?: string) {
  return fetchLookup(PATHS.customers, page, perPage, query, "q");
}

export function fetchConsignments(page: number, perPage: number, query?: string) {
  return fetchLookup(PATHS.consignments, page, perPage, query, "q");
}

/* -------------------------------------------------------------------------- */
/* Resolving one stored code to its label                                     */
/* -------------------------------------------------------------------------- */

/**
 * The lists a stored code can belong to.
 *
 * Records keep codes — `8517.12`, `USD` — because that is what the API accepts.
 * Every screen that shows one has to turn it back into a name, which is what
 * the rest of this section is for.
 */
export type LookupKind =
  | "packageType"
  | "material"
  | "hsCode"
  | "currency"
  | "manufacturer"
  | "forwarder"
  | "corporate"
  | "customer"
  | "consignment";

const FETCHERS: Record<
  LookupKind,
  (page: number, perPage: number, query?: string) => Promise<LookupListResult>
> = {
  packageType: fetchPackageTypes,
  material: fetchMaterials,
  hsCode: fetchHsCodes,
  currency: fetchCurrencies,
  manufacturer: fetchManufacturers,
  forwarder: fetchForwarders,
  corporate: fetchCorporates,
  customer: fetchCustomers,
  consignment: fetchConsignments,
};

const RESOLVE_PAGE_SIZE = 20;

/**
 * Codes are immutable, so a resolved label never goes stale.
 *
 * Module-level rather than per-call: a consignment with thirty items repeats
 * the same handful of currencies and HS codes, and every dialog that opens
 * afterwards asks for the same ones again. Promises are cached rather than
 * values, so twenty simultaneous callers for one code share a single request.
 *
 * Bounded in practice by the number of distinct codes a session actually looks
 * at — a few hundred strings at worst.
 */
const labelCache = new Map<string, Promise<string>>();

/**
 * One stored code, as the name a person should read.
 *
 * Searches by the code first — the fastest path when the endpoint indexes it —
 * then falls back to scanning the unfiltered first page, and finally to the
 * code itself. Showing `8517.12` is a worse answer than "Mobile phones" but a
 * far better one than an empty field, so this never rejects and never returns
 * an empty string for a non-empty code.
 */
export function resolveLookupLabel(
  kind: LookupKind,
  code: string | undefined | null,
): Promise<string> {
  const value = String(code ?? "").trim();
  if (!value) return Promise.resolve("");

  const key = `${kind}:${value}`;
  const cached = labelCache.get(key);
  if (cached) return cached;

  const pending = (async () => {
    const fetchPage = FETCHERS[kind];

    try {
      const searched = await fetchPage(1, RESOLVE_PAGE_SIZE, value);
      const hit = searched.data.find((option) => String(option.value) === value);
      if (hit) return hit.label;

      const firstPage = await fetchPage(1, RESOLVE_PAGE_SIZE);
      const fallback = firstPage.data.find(
        (option) => String(option.value) === value,
      );
      return fallback?.label ?? value;
    } catch {
      // A failed lookup must not be cached as a permanent answer — drop it so
      // the next caller retries rather than being stuck with the code forever.
      labelCache.delete(key);
      return value;
    }
  })();

  labelCache.set(key, pending);
  return pending;
}
