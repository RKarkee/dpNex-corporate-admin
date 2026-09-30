export interface SummaryReportFilters {
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

export interface SummaryReportConsignments {
  consignment_count: number;
  box_count: number;
  total_weight: string;
  declared_value: string;
  [key: string]: unknown;
}

export interface SummaryReportBilling {
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

/**
 * A plain `{ status: count }` map rather than an array — `PENDING`,
 * `PARTIALLY_SETTLED`, and `SETTLED` are the three keys confirmed so far,
 * kept as named fields for the common case, plus an index signature in case
 * the backend ever adds another settlement state.
 */
export interface SummaryReportSettlement {
  PENDING: number;
  PARTIALLY_SETTLED: number;
  SETTLED: number;
  [key: string]: number;
}

export interface SummaryReportStatusCount {
  status: string;
  consignment_count: number;
  [key: string]: unknown;
}

/**
 * One row of `breakdown` — a category of whatever dimension `group_by`
 * requested (the confirmed response grouped by `COUNTRY`), carrying both the
 * consignment and billing figures for that category. Unlike the other
 * reports' `{dimension, categories, series, rows}` group shape, this is a
 * flat array whose fields are confirmed and fixed, so it is typed directly
 * rather than read generically.
 */
export interface SummaryReportBreakdownRow {
  key: string;
  label: string;
  consignment_count: number;
  box_count: number;
  total_weight: string;
  declared_value: string;
  invoice_count: number;
  billed_amount: string;
  collected_amount: string;
  outstanding_amount: string;
  [key: string]: unknown;
}

export interface SummaryReport {
  filters: SummaryReportFilters;
  consignments: SummaryReportConsignments;
  billing: SummaryReportBilling;
  settlement: SummaryReportSettlement;
  status: SummaryReportStatusCount[];
  breakdown: SummaryReportBreakdownRow[];
  [key: string]: unknown;
}

export interface SummaryReportParams {
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
