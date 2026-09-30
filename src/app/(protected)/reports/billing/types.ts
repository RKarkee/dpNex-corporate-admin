export interface BillingReportFilters {
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

export interface BillingReportTotals {
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

export type BillingReportTileFormat = "integer" | "weight" | "currency" | "percent" | (string & {});

export interface BillingReportTile {
  key: string;
  label: string;
  format: BillingReportTileFormat;
  value: number;
  previous?: number;
  change?: number;
  change_percent?: number | null;
  [key: string]: unknown;
}

export interface BillingReportCollections {
  payment_count: number;
  received_amount: string;
  allocated_amount: string;
  unallocated_amount: string;
  [key: string]: unknown;
}

export interface BillingReportAdjustments {
  adjustment_count: number;
  debit_amount: string;
  credit_amount: string;
  net_amount: string;
  [key: string]: unknown;
}

export type BillingReportTimeseriesPoint = Record<string, unknown>;

/**
 * `breakdown` came back as a plain array (`[]`), not the
 * `{dimension, categories, series, rows}` group shape the consignment,
 * customer, and request reports use — and it's always been empty (no
 * `group_by` has been exercised yet), so each row's real shape is
 * unconfirmed. Modelled as loose records rather than a fixed interface; the
 * table that renders this derives its columns from whatever keys a row
 * actually has.
 */
export type BillingReportBreakdownRow = Record<string, unknown>;

export interface BillingReport {
  filters: BillingReportFilters;
  totals: BillingReportTotals;
  tiles: BillingReportTile[];
  collections: BillingReportCollections;
  adjustments: BillingReportAdjustments;
  timeseries: BillingReportTimeseriesPoint[];
  breakdown: BillingReportBreakdownRow[];
  [key: string]: unknown;
}

export interface BillingReportParams {
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
