export interface CustomerReportFilters {
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

export interface CustomerReportTotals {
  total: number;
  leads: number;
  customers: number;
  tcustomers: number;
  individual: number;
  corporate: number;
  individual_leads: number;
  corporate_leads: number;
  individual_customers: number;
  corporate_customers: number;
  converted: number;
  [key: string]: unknown;
}

export type CustomerReportTileFormat = "integer" | "weight" | "currency" | (string & {});

export interface CustomerReportTile {
  key: string;
  label: string;
  format: CustomerReportTileFormat;
  value: number;
  previous?: number;
  change?: number;
  change_percent?: number | null;
  [key: string]: unknown;
}

export type CustomerReportTimeseriesPoint = Record<string, unknown>;

/**
 * `breakdown` (by classification) and `activity` (per-customer volumes) are
 * both this exact shape in the real response, so one interface covers both
 * instead of two near-identical ones.
 */
export interface CustomerReportGroup {
  dimension: string;
  categories: { key: string; label: string; [key: string]: unknown }[];
  series: {
    key: string;
    label: string;
    format: CustomerReportTileFormat;
    data: number[];
    [key: string]: unknown;
  }[];
  rows: { key: string; label: string; [key: string]: unknown }[];
}

/**
 * Whether reporting is available at all is itself a field on this response
 * — a corporate (non-internal) user gets `supported: false` with a reason
 * rather than an error, so this is modelled as data to display, not as a
 * request failure.
 */
export interface CustomerReportConversions {
  supported: boolean;
  reason?: string | null;
  [key: string]: unknown;
}

export interface CustomerReport {
  filters: CustomerReportFilters;
  totals: CustomerReportTotals;
  tiles: CustomerReportTile[];
  timeseries: CustomerReportTimeseriesPoint[];
  breakdown: CustomerReportGroup;
  conversions: CustomerReportConversions;
  activity: CustomerReportGroup;
  [key: string]: unknown;
}

export interface CustomerReportParams {
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
