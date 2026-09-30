import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";

import type {
  DashboardBilling,
  DashboardCollections,
  DashboardConsignments,
  DashboardReport,
  DashboardReportParams,
  DashboardRequests,
  DashboardStatusCount,
  DashboardTile,
} from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Picks the report out of the envelope.
 *
 * Confirmed live: the endpoint answers under `report`, and `get()` has
 * already unwrapped the response down to the envelope's `data` field (the
 * same quirk documented on the consignment billing service's
 * `readInvoiceDetail`), so `raw` here is `{ report: {...} }` directly.
 * `raw.data.report` and a bare `raw` that already looks like a report (has
 * a `tiles` array) stay as defensive fallbacks.
 */
function readReport(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [raw.report, data?.report, data, raw];

  for (const candidate of candidates) {
    if (isRecord(candidate) && ("tiles" in candidate || "consignments" in candidate)) {
      return candidate;
    }
  }

  return null;
}

const ZERO_CONSIGNMENTS: DashboardConsignments = {
  consignment_count: 0,
  box_count: 0,
  total_weight: "0.00",
  declared_value: "0.00",
};

const ZERO_BILLING: DashboardBilling = {
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

const ZERO_REQUESTS: DashboardRequests = {
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

const ZERO_COLLECTIONS: DashboardCollections = {
  payment_count: 0,
  received_amount: "0.00",
  allocated_amount: "0.00",
  unallocated_amount: "0.00",
};

/** Fills in the fields the dashboard dereferences directly, without inventing data. */
function normalizeReport(raw: Record<string, unknown>): DashboardReport {
  return {
    ...raw,
    filters: isRecord(raw.filters) ? (raw.filters as unknown as DashboardReport["filters"]) : ({} as DashboardReport["filters"]),
    consignments: isRecord(raw.consignments)
      ? (raw.consignments as unknown as DashboardConsignments)
      : ZERO_CONSIGNMENTS,
    billing: isRecord(raw.billing) ? (raw.billing as unknown as DashboardBilling) : ZERO_BILLING,
    requests: isRecord(raw.requests) ? (raw.requests as unknown as DashboardRequests) : ZERO_REQUESTS,
    collections: isRecord(raw.collections)
      ? (raw.collections as unknown as DashboardCollections)
      : ZERO_COLLECTIONS,
    statuses: Array.isArray(raw.statuses)
      ? (raw.statuses.filter(isRecord) as DashboardStatusCount[])
      : [],
    tiles: Array.isArray(raw.tiles) ? (raw.tiles.filter(isRecord) as DashboardTile[]) : [],
    timeseries: Array.isArray(raw.timeseries) ? raw.timeseries.filter(isRecord) : [],
  };
}

/**
 * The corporate's dashboard for a date range — `GET
 * /corporate/reports/dashboard`.
 *
 * Every filter the endpoint accepts can be passed, but the dashboard itself
 * only ever sets `from_date`/`to_date` today — the rest (branch, agent,
 * airline, staff…) would each need their own lookup source the UI does not
 * have yet, so they are left for whoever wires up that filter next.
 */
export async function fetchDashboardReport(
  params: DashboardReportParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<DashboardReport> {
  const raw = await privateApiClient.get<unknown>("/corporate/reports/dashboard", {
    params,
    // The page renders its own error card; the client's toast would double up.
    silent: true,
    signal: options.signal,
  });

  const record = readReport(raw);
  if (!record) throw new ApiError(502, "The dashboard could not be loaded. Please try again.");

  return normalizeReport(record);
}
