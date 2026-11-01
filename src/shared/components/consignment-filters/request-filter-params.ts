"use client";

import { useCallback, useMemo } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";

/**
 * The consignment-request list filters, their URL encoding, and the mapping to
 * API query params. Filters live in the URL (namespaced per tab by `prefix`)
 * so a refresh, a bookmark and the Back button restore the same view, and the
 * list and deleted tabs keep independent filters.
 */

export interface ConsignmentRequestFilterValues {
  search: string;
  request_tracking_id: string;
  third_party_tracking: string;
  shipper_reference_code: string;
  status: string[];
  customer_id: string;
  cif_id: string;
  corporate_id: string;
  user_id: string;
  branch_id: string;
  via_code: string;
  integrator_code: string[];
  agent_code: string;
  service_code: string;
  product_type: string;
  urgency: string;
  mode_of_transport: string;
  sender_country: string;
  receiver_country: string;
  receiver_city: string;
  has_consignment: string;
  need_pickup: string;
  weight_min: string;
  weight_max: string;
  created_from: string;
  created_to: string;
  ship_date_from: string;
  ship_date_to: string;
}

export const ARRAY_KEYS = ["status", "integrator_code"] as const;

export const EMPTY_FILTERS: ConsignmentRequestFilterValues = {
  search: "",
  request_tracking_id: "",
  third_party_tracking: "",
  shipper_reference_code: "",
  status: [],
  customer_id: "",
  cif_id: "",
  corporate_id: "",
  user_id: "",
  branch_id: "",
  via_code: "",
  integrator_code: [],
  agent_code: "",
  service_code: "",
  product_type: "",
  urgency: "",
  mode_of_transport: "",
  sender_country: "",
  receiver_country: "",
  receiver_city: "",
  has_consignment: "",
  need_pickup: "",
  weight_min: "",
  weight_max: "",
  created_from: "",
  created_to: "",
  ship_date_from: "",
  ship_date_to: "",
};

export const PER_PAGE_OPTIONS = [15, 25, 50, 100] as const;
export const DEFAULT_PER_PAGE = 15;

export const PRIMARY_FILTER_KEYS = ["search", "status"] as const;
export const ADVANCED_FILTER_KEYS = (
  Object.keys(EMPTY_FILTERS) as (keyof ConsignmentRequestFilterValues)[]
).filter((key) => !(PRIMARY_FILTER_KEYS as readonly string[]).includes(key));

const isArrayKey = (key: string): key is (typeof ARRAY_KEYS)[number] =>
  (ARRAY_KEYS as readonly string[]).includes(key);

const isSet = (value: string | string[]): boolean =>
  Array.isArray(value) ? value.length > 0 : Boolean(value);

export const countActiveFilters = (f: ConsignmentRequestFilterValues): number =>
  (
    Object.keys(EMPTY_FILTERS) as (keyof ConsignmentRequestFilterValues)[]
  ).filter((key) => isSet(f[key])).length;

export const countAdvancedFilters = (
  f: ConsignmentRequestFilterValues,
): number => ADVANCED_FILTER_KEYS.filter((key) => isSet(f[key])).length;

/* ── URL <-> state ──────────────────────────────────────────────────────── */

const readText = (raw: string | null, max: number): string => {
  const v = (raw ?? "").trim();
  return v.length > max ? v.slice(0, max) : v;
};
const readBool = (raw: string | null): string =>
  raw === "true" ? "true" : raw === "false" ? "false" : "";
const readNumber = (raw: string | null): string => {
  if (!raw) return "";
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? raw : "";
};
const readDate = (raw: string | null): string =>
  raw && !Number.isNaN(new Date(raw).getTime()) ? raw : "";
const readList = (raw: string | null): string[] =>
  (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const readInt = (raw: string | null): number | null => {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export interface ConsignmentRequestListState {
  filters: ConsignmentRequestFilterValues;
  page: number;
  perPage: number;
}

export const parseListState = (
  params: ReadonlyURLSearchParams | URLSearchParams | null,
  prefix: string,
): ConsignmentRequestListState => {
  const get = (key: string) => params?.get(`${prefix}${key}`) ?? null;
  return {
    filters: {
      search: readText(get("search"), 60),
      request_tracking_id: readText(get("request_tracking_id"), 40),
      third_party_tracking: readText(get("third_party_tracking"), 40),
      shipper_reference_code: readText(get("shipper_reference_code"), 40),
      status: readList(get("status")),
      customer_id: readText(get("customer_id"), 20),
      cif_id: readText(get("cif_id"), 30),
      corporate_id: readText(get("corporate_id"), 20),
      user_id: readText(get("user_id"), 20),
      branch_id: readText(get("branch_id"), 20),
      via_code: readText(get("via_code"), 20),
      integrator_code: readList(get("integrator_code")),
      agent_code: readText(get("agent_code"), 20),
      service_code: readText(get("service_code"), 20),
      product_type: readText(get("product_type"), 3),
      urgency: readText(get("urgency"), 20),
      mode_of_transport: readText(get("mode_of_transport"), 20),
      sender_country: readText(get("sender_country"), 2),
      receiver_country: readText(get("receiver_country"), 2),
      receiver_city: readText(get("receiver_city"), 60),
      has_consignment: readBool(get("has_consignment")),
      need_pickup: readBool(get("need_pickup")),
      weight_min: readNumber(get("weight_min")),
      weight_max: readNumber(get("weight_max")),
      created_from: readDate(get("created_from")),
      created_to: readDate(get("created_to")),
      ship_date_from: readDate(get("ship_date_from")),
      ship_date_to: readDate(get("ship_date_to")),
    },
    page: readInt(get("page")) ?? 1,
    perPage:
      PER_PAGE_OPTIONS.find((o) => o === readInt(get("per_page"))) ??
      DEFAULT_PER_PAGE,
  };
};

export const applyListState = (
  current: URLSearchParams,
  state: ConsignmentRequestListState,
  prefix: string,
): URLSearchParams => {
  const next = new URLSearchParams(current.toString());
  const set = (key: string, value: string) => {
    if (value) next.set(`${prefix}${key}`, value);
    else next.delete(`${prefix}${key}`);
  };
  for (const [key, value] of Object.entries(state.filters)) {
    set(
      key,
      isArrayKey(key) ? (value as string[]).join(",") : (value as string),
    );
  }
  set("page", state.page > 1 ? String(state.page) : "");
  set(
    "per_page",
    state.perPage !== DEFAULT_PER_PAGE ? String(state.perPage) : "",
  );
  return next;
};

/** Filter values → API query params (page / per_page are added by the hook). */
export const toApiFilters = (
  filters: ConsignmentRequestFilterValues,
): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (!isSet(value)) continue;
    out[key] = value; // status[] / integrator_code[] stay arrays; scalars as-is
  }
  return out;
};

/* ── the per-tab URL hook ───────────────────────────────────────────────── */

export function useConsignmentRequestFilters(prefix: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(
    () => parseListState(searchParams, prefix),
    [searchParams, prefix],
  );

  const commit = useCallback(
    (nextState: ConsignmentRequestListState) => {
      const current = new URLSearchParams(searchParams?.toString() ?? "");
      const next = applyListState(current, nextState, prefix);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, prefix],
  );

  const setFilters = useCallback(
    (filters: ConsignmentRequestFilterValues) =>
      commit({ filters, page: 1, perPage: state.perPage }),
    [commit, state.perPage],
  );
  const reset = useCallback(
    () => commit({ filters: EMPTY_FILTERS, page: 1, perPage: state.perPage }),
    [commit, state.perPage],
  );
  const setPage = useCallback(
    (page: number) => commit({ ...state, page }),
    [commit, state],
  );
  const setPerPage = useCallback(
    (perPage: number) => commit({ filters: state.filters, page: 1, perPage }),
    [commit, state.filters],
  );

  return { ...state, setFilters, reset, setPage, setPerPage };
}
