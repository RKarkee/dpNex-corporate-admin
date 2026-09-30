import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";

import { extensionFromContentType, filenameFromContentDisposition, safeFileName } from "../_lib/download-file";
import type {
  BillingReport,
  BillingReportFilters,
  BillingReportParams,
  BillingReportTile,
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
    if (isRecord(candidate) && ("tiles" in candidate || "totals" in candidate || "collections" in candidate)) {
      return candidate;
    }
  }
  return null;
}

const ZERO_FILTERS: BillingReportFilters = {
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

const ZERO_TOTALS: BillingReport["totals"] = {
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

const ZERO_COLLECTIONS: BillingReport["collections"] = {
  payment_count: 0,
  received_amount: "0.00",
  allocated_amount: "0.00",
  unallocated_amount: "0.00",
};

const ZERO_ADJUSTMENTS: BillingReport["adjustments"] = {
  adjustment_count: 0,
  debit_amount: "0.00",
  credit_amount: "0.00",
  net_amount: "0.00",
};

function normalizeReport(raw: Record<string, unknown>): BillingReport {
  const filters = isRecord(raw.filters) ? { ...ZERO_FILTERS, ...raw.filters } : ZERO_FILTERS;
  const totals = isRecord(raw.totals) ? { ...ZERO_TOTALS, ...raw.totals } : ZERO_TOTALS;
  const collections = isRecord(raw.collections) ? { ...ZERO_COLLECTIONS, ...raw.collections } : ZERO_COLLECTIONS;
  const adjustments = isRecord(raw.adjustments) ? { ...ZERO_ADJUSTMENTS, ...raw.adjustments } : ZERO_ADJUSTMENTS;

  return {
    ...raw,
    filters,
    totals,
    collections,
    adjustments,
    tiles: Array.isArray(raw.tiles) ? (raw.tiles.filter(isRecord) as BillingReportTile[]) : [],
    timeseries: Array.isArray(raw.timeseries) ? raw.timeseries.filter(isRecord) : [],
    // `breakdown` is a plain array in the confirmed response (always empty
    // so far) rather than the `{dimension, categories, series, rows}` group
    // shape the other reports use — kept as loose records.
    breakdown: Array.isArray(raw.breakdown) ? raw.breakdown.filter(isRecord) : [],
  } as BillingReport;
}

/**
 * The billing report for a date range — `GET /corporate/reports/billing`.
 *
 * Every filter the endpoint accepts can be passed, but the report page only
 * ever sets `from_date`/`to_date` today — the rest (branch, agent, airline,
 * staff…) would each need their own lookup source the UI does not have yet.
 */
export async function fetchBillingReport(
  params: BillingReportParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<BillingReport> {
  const raw = await privateApiClient.get<unknown>("/corporate/reports/billing", {
    params,
    // The page renders its own error card; the client's toast would double up.
    silent: true,
    signal: options.signal,
  });

  const record = readReport(raw);
  if (!record) throw new ApiError(502, "The billing report could not be loaded. Please try again.");

  return normalizeReport(record);
}

/**
 * The billing report as a downloadable file — `GET
 * /corporate/reports/export/billing`.
 *
 * The export format (csv/xlsx/pdf) is not confirmed, so this makes no
 * assumption about it: `.request()` (not `.get()`) is used so the response's
 * headers are reachable, and the saved file's name comes from the server's
 * own `Content-Disposition` when it sends one, falling back to a name built
 * from the date range with an extension guessed off `Content-Type`.
 *
 * Not `silent`: unlike the report read, there is no inline error state for a
 * download action, so the client's own toast is the only place this failure
 * would otherwise surface.
 */
export async function exportBillingReport(
  params: BillingReportParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<{ blob: Blob; filename: string }> {
  const response = await privateApiClient.request<Blob>(
    "GET",
    "/corporate/reports/export/billing",
    undefined,
    {
      params,
      responseType: "blob",
      signal: options.signal,
    },
  );

  const blob = response.data;
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new ApiError(502, "The billing report export could not be generated. Please try again.");
  }

  const contentType = response.headers.get("content-type");
  const suggested = filenameFromContentDisposition(response.headers.get("content-disposition"));
  const fallbackRange = [params.from_date, params.to_date].filter(Boolean).join("_to_");
  const filename =
    suggested ?? safeFileName(`billing-report${fallbackRange ? `_${fallbackRange}` : ""}`, extensionFromContentType(contentType));

  return { blob, filename };
}
