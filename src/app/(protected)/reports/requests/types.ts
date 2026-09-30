export interface RequestReportFilters {
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

export interface RequestReportTotals {
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

export type RequestReportTileFormat = "integer" | "weight" | "currency" | "percent" | (string & {});

export interface RequestReportTile {
  key: string;
  label: string;
  format: RequestReportTileFormat;
  value: number;
  previous?: number;
  change?: number;
  change_percent?: number | null;
  [key: string]: unknown;
}

export type RequestReportTimeseriesPoint = Record<string, unknown>;

/**
 * `statuses` (by status) and `by_customer` (by customer) are both this exact
 * shape in the real response, so one interface covers both.
 */
export interface RequestReportGroup {
  dimension: string;
  categories: { key: string; label: string; [key: string]: unknown }[];
  series: {
    key: string;
    label: string;
    format: RequestReportTileFormat;
    data: number[];
    [key: string]: unknown;
  }[];
  rows: { key: string; label: string; [key: string]: unknown }[];
}

export interface RequestReport {
  filters: RequestReportFilters;
  totals: RequestReportTotals;
  tiles: RequestReportTile[];
  timeseries: RequestReportTimeseriesPoint[];
  statuses: RequestReportGroup;
  by_customer: RequestReportGroup;
  [key: string]: unknown;
}

export interface RequestReportParams {
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
