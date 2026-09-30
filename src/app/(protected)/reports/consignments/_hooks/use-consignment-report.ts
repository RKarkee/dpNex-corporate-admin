"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchConsignmentReport } from "../services/consignment-report.service";
import type { ConsignmentReportParams } from "../types";

/**
 * The consignment report for a date range and grouping.
 *
 * Keyed on the filters so a range or grouping change is its own cache entry
 * rather than a refetch of the same key — flipping back to a previously
 * viewed combination shows it instantly from cache instead of re-hitting the
 * network.
 */
export function useConsignmentReport(params: ConsignmentReportParams = {}) {
  return useQuery({
    queryKey: ["consignment-report", params] as const,
    queryFn: ({ signal }) => fetchConsignmentReport(params, { signal }),
    staleTime: 60 * 1000,
  });
}
