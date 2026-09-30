import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";

import type {
  ConsignmentReport,
  ConsignmentReportBreakdown,
  ConsignmentReportFilters,
  ConsignmentReportParams,
  ConsignmentReportTile,
} from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Picks the report out of the envelope.
 *
 * `privateApiClient.get()` already unwraps down to the envelope's `data`
 * field (see `extractData` in `create-client.ts`), so by the time it lands
 * here `raw` is already `{ report: {...} }` for `/corporate/reports/*` —
 * the same shape confirmed for the dashboard report. `raw.data` is checked
 * too, purely as a defensive fallback in case this ever receives the full,
 * un-unwrapped body.
 */
function readReport(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [raw.report, data?.report, data, raw];
  for (const candidate of candidates) {
    if (isRecord(candidate) && ("tiles" in candidate || "totals" in candidate || "breakdown" in candidate)) {
      return candidate;
    }
  }
  return null;
}

const ZERO_FILTERS: ConsignmentReportFilters = {
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

const ZERO_TOTALS = {
  consignment_count: 0,
  box_count: 0,
  total_weight: "0.00",
  declared_value: "0.00",
};

const ZERO_BREAKDOWN: ConsignmentReportBreakdown = {
  dimension: "",
  categories: [],
  series: [],
  rows: [],
};

function normalizeReport(raw: Record<string, unknown>): ConsignmentReport {
  const filters = isRecord(raw.filters) ? { ...ZERO_FILTERS, ...raw.filters } : ZERO_FILTERS;
  const totals = isRecord(raw.totals) ? { ...ZERO_TOTALS, ...raw.totals } : ZERO_TOTALS;
  const breakdown = isRecord(raw.breakdown)
    ? {
        dimension: typeof raw.breakdown.dimension === "string" ? raw.breakdown.dimension : "",
        categories: Array.isArray(raw.breakdown.categories) ? raw.breakdown.categories.filter(isRecord) : [],
        series: Array.isArray(raw.breakdown.series) ? raw.breakdown.series.filter(isRecord) : [],
        rows: Array.isArray(raw.breakdown.rows) ? raw.breakdown.rows.filter(isRecord) : [],
      }
    : ZERO_BREAKDOWN;

  return {
    ...raw,
    filters,
    totals,
    breakdown,
    statuses: Array.isArray(raw.statuses) ? raw.statuses.filter(isRecord) : [],
    tiles: Array.isArray(raw.tiles) ? (raw.tiles.filter(isRecord) as ConsignmentReportTile[]) : [],
    timeseries: Array.isArray(raw.timeseries) ? raw.timeseries.filter(isRecord) : [],
  } as ConsignmentReport;
}

/**
 * The consignment report for a date range and grouping — `GET
 * /corporate/reports/consignments`.
 *
 * Every filter the endpoint accepts can be passed, but the report page only
 * ever sets `from_date`/`to_date`/`group_by` today — the rest (branch,
 * agent, airline, staff…) would each need their own lookup source the UI
 * does not have yet.
 */
export async function fetchConsignmentReport(
  params: ConsignmentReportParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<ConsignmentReport> {
  const raw = await privateApiClient.get<unknown>("/corporate/reports/consignments", {
    params,
    // The page renders its own error card; the client's toast would double up.
    silent: true,
    signal: options.signal,
  });

  const record = readReport(raw);
  if (!record) throw new ApiError(502, "The consignment report could not be loaded. Please try again.");

  return normalizeReport(record);
}
