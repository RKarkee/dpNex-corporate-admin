import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";

import type {
  CustomerReport,
  CustomerReportConversions,
  CustomerReportFilters,
  CustomerReportGroup,
  CustomerReportParams,
  CustomerReportTile,
} from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Picks the report out of the envelope.
 *
 * `privateApiClient.get()` already unwraps down to the envelope's `data`
 * field, so by the time it lands here `raw` is already `{ report: {...} }`
 * — the same shape confirmed for the dashboard and consignment reports.
 * `raw.data` is checked too, purely as a defensive fallback in case this
 * ever receives the full, un-unwrapped body.
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

const ZERO_FILTERS: CustomerReportFilters = {
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

const ZERO_TOTALS: CustomerReport["totals"] = {
  total: 0,
  leads: 0,
  customers: 0,
  tcustomers: 0,
  individual: 0,
  corporate: 0,
  individual_leads: 0,
  corporate_leads: 0,
  individual_customers: 0,
  corporate_customers: 0,
  converted: 0,
};

const ZERO_GROUP: CustomerReportGroup = {
  dimension: "",
  categories: [],
  series: [],
  rows: [],
};

const ZERO_CONVERSIONS: CustomerReportConversions = {
  supported: false,
  reason: null,
};

function normalizeGroup(raw: unknown): CustomerReportGroup {
  if (!isRecord(raw)) return ZERO_GROUP;
  return {
    dimension: typeof raw.dimension === "string" ? raw.dimension : "",
    categories: Array.isArray(raw.categories)
      ? (raw.categories.filter(isRecord) as CustomerReportGroup["categories"])
      : [],
    series: Array.isArray(raw.series) ? (raw.series.filter(isRecord) as CustomerReportGroup["series"]) : [],
    rows: Array.isArray(raw.rows) ? (raw.rows.filter(isRecord) as CustomerReportGroup["rows"]) : [],
  };
}

function normalizeReport(raw: Record<string, unknown>): CustomerReport {
  const filters = isRecord(raw.filters) ? { ...ZERO_FILTERS, ...raw.filters } : ZERO_FILTERS;
  const totals = isRecord(raw.totals) ? { ...ZERO_TOTALS, ...raw.totals } : ZERO_TOTALS;
  const conversions = isRecord(raw.conversions) ? { ...ZERO_CONVERSIONS, ...raw.conversions } : ZERO_CONVERSIONS;

  return {
    ...raw,
    filters,
    totals,
    conversions,
    breakdown: normalizeGroup(raw.breakdown),
    activity: normalizeGroup(raw.activity),
    tiles: Array.isArray(raw.tiles) ? (raw.tiles.filter(isRecord) as CustomerReportTile[]) : [],
    timeseries: Array.isArray(raw.timeseries) ? raw.timeseries.filter(isRecord) : [],
  } as CustomerReport;
}

/**
 * The customer report for a date range — `GET /corporate/reports/customers`.
 *
 * Every filter the endpoint accepts can be passed, but the report page only
 * ever sets `from_date`/`to_date` today — the rest (branch, agent, airline,
 * staff…) would each need their own lookup source the UI does not have yet,
 * and `group_by` was `null` in the confirmed response (the classification
 * breakdown below is generated regardless).
 */
export async function fetchCustomerReport(
  params: CustomerReportParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<CustomerReport> {
  const raw = await privateApiClient.get<unknown>("/corporate/reports/customers", {
    params,
    // The page renders its own error card; the client's toast would double up.
    silent: true,
    signal: options.signal,
  });

  const record = readReport(raw);
  if (!record) throw new ApiError(502, "The customer report could not be loaded. Please try again.");

  return normalizeReport(record);
}
