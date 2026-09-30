import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";

import type {
  OutstandingReport,
  OutstandingReportFilters,
  OutstandingReportGroup,
  OutstandingReportParams,
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
    if (isRecord(candidate) && ("totals" in candidate || "accounts" in candidate)) {
      return candidate;
    }
  }
  return null;
}

const ZERO_FILTERS: OutstandingReportFilters = {
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

const ZERO_TOTALS: OutstandingReport["totals"] = {
  invoice_count: 0,
  gross_amount: "0.00",
  discount_amount: "0.00",
  tax_amount: "0.00",
  net_amount: "0.00",
  adjustments_amount: "0.00",
  advance_amount: "0.00",
  billed_amount: "0.00",
  collected_amount: "0.00",
  outstanding_amount: "0.00",
};

const ZERO_GROUP: OutstandingReportGroup = {
  dimension: "",
  categories: [],
  series: [],
  rows: [],
};

function normalizeGroup(raw: unknown): OutstandingReportGroup {
  if (!isRecord(raw)) return ZERO_GROUP;
  return {
    dimension: typeof raw.dimension === "string" ? raw.dimension : "",
    categories: Array.isArray(raw.categories)
      ? (raw.categories.filter(isRecord) as OutstandingReportGroup["categories"])
      : [],
    series: Array.isArray(raw.series) ? (raw.series.filter(isRecord) as OutstandingReportGroup["series"]) : [],
    rows: Array.isArray(raw.rows) ? (raw.rows.filter(isRecord) as OutstandingReportGroup["rows"]) : [],
  };
}

function normalizeReport(raw: Record<string, unknown>): OutstandingReport {
  const filters = isRecord(raw.filters) ? { ...ZERO_FILTERS, ...raw.filters } : ZERO_FILTERS;
  const totals = isRecord(raw.totals) ? { ...ZERO_TOTALS, ...raw.totals } : ZERO_TOTALS;

  return {
    ...raw,
    filters,
    totals,
    accounts: normalizeGroup(raw.accounts),
  } as OutstandingReport;
}

/**
 * The outstanding-balances report for a date range — `GET
 * /corporate/reports/outstanding`.
 *
 * Every filter the endpoint accepts can be passed, but the report page only
 * ever sets `from_date`/`to_date` today — the rest (branch, agent, airline,
 * staff…) would each need their own lookup source the UI does not have yet.
 */
export async function fetchOutstandingReport(
  params: OutstandingReportParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<OutstandingReport> {
  const raw = await privateApiClient.get<unknown>("/corporate/reports/outstanding", {
    params,
    // The page renders its own error card; the client's toast would double up.
    silent: true,
    signal: options.signal,
  });

  const record = readReport(raw);
  if (!record) throw new ApiError(502, "The outstanding report could not be loaded. Please try again.");

  return normalizeReport(record);
}
