import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";

import type {
  SummaryReport,
  SummaryReportBreakdownRow,
  SummaryReportFilters,
  SummaryReportParams,
  SummaryReportSettlement,
  SummaryReportStatusCount,
} from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Picks the summary out of the envelope.
 *
 * `privateApiClient.get()` already unwraps down to the envelope's `data`
 * field, so by the time it lands here `raw` is already `{ summary: {...} }`
 * — note the key is `summary`, not `report` like every other
 * `/corporate/reports/*` endpoint. `raw.data` is checked too, purely as a
 * defensive fallback in case this ever receives the full, un-unwrapped body.
 */
function readSummary(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [raw.summary, data?.summary, data, raw];
  for (const candidate of candidates) {
    if (isRecord(candidate) && ("consignments" in candidate || "billing" in candidate || "breakdown" in candidate)) {
      return candidate;
    }
  }
  return null;
}

const ZERO_FILTERS: SummaryReportFilters = {
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

const ZERO_CONSIGNMENTS: SummaryReport["consignments"] = {
  consignment_count: 0,
  box_count: 0,
  total_weight: "0.00",
  declared_value: "0.00",
};

const ZERO_BILLING: SummaryReport["billing"] = {
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

const ZERO_SETTLEMENT: SummaryReportSettlement = {
  PENDING: 0,
  PARTIALLY_SETTLED: 0,
  SETTLED: 0,
};

function normalizeReport(raw: Record<string, unknown>): SummaryReport {
  const filters = isRecord(raw.filters) ? { ...ZERO_FILTERS, ...raw.filters } : ZERO_FILTERS;
  const consignments = isRecord(raw.consignments) ? { ...ZERO_CONSIGNMENTS, ...raw.consignments } : ZERO_CONSIGNMENTS;
  const billing = isRecord(raw.billing) ? { ...ZERO_BILLING, ...raw.billing } : ZERO_BILLING;
  const settlement = isRecord(raw.settlement)
    ? ({ ...ZERO_SETTLEMENT, ...raw.settlement } as SummaryReportSettlement)
    : ZERO_SETTLEMENT;

  return {
    ...raw,
    filters,
    consignments,
    billing,
    settlement,
    status: Array.isArray(raw.status) ? (raw.status.filter(isRecord) as SummaryReportStatusCount[]) : [],
    breakdown: Array.isArray(raw.breakdown) ? (raw.breakdown.filter(isRecord) as SummaryReportBreakdownRow[]) : [],
  } as SummaryReport;
}

/**
 * The cross-domain summary for a date range and grouping — `GET
 * /corporate/reports/summary`.
 *
 * Every filter the endpoint accepts can be passed. Unlike the other
 * `/corporate/reports/*` endpoints, the confirmed response actually used a
 * real `group_by` value (`"COUNTRY"`), so this one exposes the grouping
 * control in its filters rather than leaving it fixed.
 */
export async function fetchSummaryReport(
  params: SummaryReportParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<SummaryReport> {
  const raw = await privateApiClient.get<unknown>("/corporate/reports/summary", {
    params,
    // The page renders its own error card; the client's toast would double up.
    silent: true,
    signal: options.signal,
  });

  const record = readSummary(raw);
  if (!record) throw new ApiError(502, "The summary report could not be loaded. Please try again.");

  return normalizeReport(record);
}
