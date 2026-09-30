import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";

import type {
  RequestReport,
  RequestReportFilters,
  RequestReportGroup,
  RequestReportParams,
  RequestReportTile,
} from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Picks the report out of the envelope.
 *
 * `privateApiClient.get()` already unwraps down to the envelope's `data`
 * field, so by the time it lands here `raw` is already `{ report: {...} }`
 * — the same shape confirmed for every other `/corporate/reports/*`
 * endpoint. `raw.data` is checked too, purely as a defensive fallback in
 * case this ever receives the full, un-unwrapped body.
 */
function readReport(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [raw.report, data?.report, data, raw];
  for (const candidate of candidates) {
    if (isRecord(candidate) && ("tiles" in candidate || "totals" in candidate || "statuses" in candidate)) {
      return candidate;
    }
  }
  return null;
}

const ZERO_FILTERS: RequestReportFilters = {
  from_date: null,
  to_date: null,
  period: null,
  group_by: null,
  date_field: null,
  branch_id: null,
  via: null,
  integrator: null,
  agent: null,
  airline: null,
  country: null,
  status: null,
  billing_status: null,
  payment_status: null,
  customer_class: null,
  customer_kind: null,
  staff_id: null,
  batch_id: null,
  module: null,
  include_cancelled: null,
};

const ZERO_TOTALS: RequestReport["totals"] = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  modification_required: 0,
  assigned: 0,
  unassigned: 0,
  box_count: 0,
  converted: 0,
  conversion_rate: 0,
};

const ZERO_GROUP: RequestReportGroup = {
  dimension: "",
  categories: [],
  series: [],
  rows: [],
};

function normalizeGroup(raw: unknown): RequestReportGroup {
  if (!isRecord(raw)) return ZERO_GROUP;
  return {
    dimension: typeof raw.dimension === "string" ? raw.dimension : "",
    categories: Array.isArray(raw.categories)
      ? (raw.categories.filter(isRecord) as RequestReportGroup["categories"])
      : [],
    series: Array.isArray(raw.series) ? (raw.series.filter(isRecord) as RequestReportGroup["series"]) : [],
    rows: Array.isArray(raw.rows) ? (raw.rows.filter(isRecord) as RequestReportGroup["rows"]) : [],
  };
}

function normalizeReport(raw: Record<string, unknown>): RequestReport {
  const filters = isRecord(raw.filters) ? { ...ZERO_FILTERS, ...raw.filters } : ZERO_FILTERS;
  const totals = isRecord(raw.totals) ? { ...ZERO_TOTALS, ...raw.totals } : ZERO_TOTALS;

  return {
    ...raw,
    filters,
    totals,
    statuses: normalizeGroup(raw.statuses),
    by_customer: normalizeGroup(raw.by_customer),
    tiles: Array.isArray(raw.tiles) ? (raw.tiles.filter(isRecord) as RequestReportTile[]) : [],
    timeseries: Array.isArray(raw.timeseries) ? raw.timeseries.filter(isRecord) : [],
  } as RequestReport;
}

/**
 * The consignment request report for a date range — `GET
 * /corporate/reports/requests`.
 *
 * Every filter the endpoint accepts can be passed, but the report page only
 * ever sets `from_date`/`to_date` today — the rest (branch, agent, airline,
 * staff…) would each need their own lookup source the UI does not have yet,
 * and `group_by` was `null` in the confirmed response (the status and
 * customer breakdowns below are generated regardless).
 */
export async function fetchRequestReport(
  params: RequestReportParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<RequestReport> {
  const raw = await privateApiClient.get<unknown>("/corporate/reports/requests", {
    params,
    // The page renders its own error card; the client's toast would double up.
    silent: true,
    signal: options.signal,
  });

  const record = readReport(raw);
  if (!record) throw new ApiError(502, "The request report could not be loaded. Please try again.");

  return normalizeReport(record);
}
