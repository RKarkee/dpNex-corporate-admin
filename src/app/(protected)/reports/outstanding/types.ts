export interface OutstandingReportFilters {
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

export interface OutstandingReportTotals {
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

export type OutstandingReportValueFormat = "integer" | "weight" | "currency" | "percent" | (string & {});

/**
 * `accounts` — the per-account billed/collected/outstanding breakdown — is
 * the same `{dimension, categories, series, rows}` shape the consignment,
 * customer, and request reports use. No `tiles` array is returned by this
 * endpoint at all; the headline figures come straight off `totals`.
 */
export interface OutstandingReportGroup {
  dimension: string;
  categories: { key: string; label: string; [key: string]: unknown }[];
  series: {
    key: string;
    label: string;
    format: OutstandingReportValueFormat;
    data: number[];
    [key: string]: unknown;
  }[];
  rows: { key: string; label: string; [key: string]: unknown }[];
}

export interface OutstandingReport {
  filters: OutstandingReportFilters;
  totals: OutstandingReportTotals;
  accounts: OutstandingReportGroup;
  [key: string]: unknown;
}

export interface OutstandingReportParams {
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
