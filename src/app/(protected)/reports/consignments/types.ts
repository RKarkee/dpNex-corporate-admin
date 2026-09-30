export interface ConsignmentReportFilters {
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

export interface ConsignmentReportTotals {
  consignment_count: number;
  box_count: number;
  total_weight: string;
  declared_value: string;
  [key: string]: unknown;
}

export type ConsignmentReportTileFormat = "integer" | "weight" | "currency" | (string & {});

export interface ConsignmentReportTile {
  key: string;
  label: string;
  format: ConsignmentReportTileFormat;
  value: number;
  previous?: number;
  change?: number;
  change_percent?: number | null;
  [key: string]: unknown;
}

export type ConsignmentReportTimeseriesPoint = Record<string, unknown>;

export interface ConsignmentReportBreakdownCategory {
  key: string;
  label: string;
  [key: string]: unknown;
}

export interface ConsignmentReportBreakdownSeries {
  key: string;
  label: string;
  format: ConsignmentReportTileFormat;
  data: number[];
  [key: string]: unknown;
}

export interface ConsignmentReportBreakdownRow {
  key: string;
  label: string;
  [key: string]: unknown;
}

export interface ConsignmentReportBreakdown {
  dimension: string;
  categories: ConsignmentReportBreakdownCategory[];
  series: ConsignmentReportBreakdownSeries[];
  rows: ConsignmentReportBreakdownRow[];
}

export interface ConsignmentReportStatusCount {
  status: string;
  consignment_count: number;
  [key: string]: unknown;
}

export interface ConsignmentReport {
  filters: ConsignmentReportFilters;
  totals: ConsignmentReportTotals;
  tiles: ConsignmentReportTile[];
  timeseries: ConsignmentReportTimeseriesPoint[];
  breakdown: ConsignmentReportBreakdown;
  statuses: ConsignmentReportStatusCount[];
  [key: string]: unknown;
}

export interface ConsignmentReportParams {
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
