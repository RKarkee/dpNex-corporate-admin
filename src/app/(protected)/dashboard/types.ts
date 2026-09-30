/**
 * `/corporate/reports/dashboard` — the corporate's own operating summary for
 * a date range: consignments moved, bills raised, requests in the pipeline,
 * payments collected, a status breakdown and a set of headline tiles.
 *
 * Confirmed against a live response. Numbers inside `consignments`,
 * `billing` and `collections` arrive as decimal strings (`"1027.00"`), the
 * same convention `billing-accounts`/`consignments/admin` billing use
 * elsewhere; `requests` and the tile `value`/`previous`/`change` fields are
 * plain JSON numbers.
 */

export interface DashboardFilters {
  from_date: string | null;
  to_date: string | null;
  period: string | null;
  group_by: string | null;
  date_field: string | null;
  branch_id: number | string | null;
  via: string | null;
  integrator: string | null;
  agent: string | null;
  airline: string | null;
  country: string | null;
  status: string | null;
  billing_status: string | null;
  payment_status: string | null;
  customer_class: string | null;
  customer_kind: string | null;
  staff_id: number | string | null;
  batch_id: number | string | null;
  module: string | null;
  include_cancelled: boolean | string | null;

  [key: string]: unknown;
}

export interface DashboardConsignments {
  consignment_count: number;
  box_count: number;
  total_weight: string;
  declared_value: string;

  [key: string]: unknown;
}

export interface DashboardBilling {
  invoice_count: number;
  gross_amount: string;
  discount_amount: string;
  tax_amount: string;
  net_amount: string;
  adjustments_amount: string;
  advance_amount: string;
  billed_amount: string;
  collected_amount: string;
  outstanding_amount: string;

  [key: string]: unknown;
}

export interface DashboardRequests {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  modification_required: number;
  assigned: number;
  unassigned: number;
  box_count: number;
  converted: number;
  conversion_rate: number;

  [key: string]: unknown;
}

export interface DashboardCollections {
  payment_count: number;
  received_amount: string;
  allocated_amount: string;
  unallocated_amount: string;

  [key: string]: unknown;
}

export interface DashboardStatusCount {
  status: string;
  consignment_count: number;

  [key: string]: unknown;
}

export type DashboardTileFormat = "integer" | "weight" | "currency" | (string & {});

export interface DashboardTile {
  key: string;
  label: string;
  format: DashboardTileFormat;
  value: number;
  previous?: number;
  change?: number;
  change_percent?: number | null;

  [key: string]: unknown;
}

/**
 * One point on the trend line. **Unconfirmed shape** — every response seen so
 * far answers with an empty array, so this is read defensively wherever it's
 * rendered rather than typed against a guessed set of fields.
 */
export type DashboardTimeseriesPoint = Record<string, unknown>;

export interface DashboardReport {
  filters: DashboardFilters;
  consignments: DashboardConsignments;
  billing: DashboardBilling;
  requests: DashboardRequests;
  collections: DashboardCollections;
  statuses: DashboardStatusCount[];
  tiles: DashboardTile[];
  timeseries: DashboardTimeseriesPoint[];

  [key: string]: unknown;
}

/** Every field the endpoint's `filters` block echoes, all optional on the way in. */
export interface DashboardReportParams {
  from_date?: string;
  to_date?: string;
  period?: string;
  group_by?: string;
  date_field?: string;
  branch_id?: number | string;
  via?: string;
  integrator?: string;
  agent?: string;
  airline?: string;
  country?: string;
  status?: string;
  billing_status?: string;
  payment_status?: string;
  customer_class?: string;
  customer_kind?: string;
  staff_id?: number | string;
  batch_id?: number | string;
  module?: string;
  include_cancelled?: boolean;

  [key: string]: string | number | boolean | undefined;
}
