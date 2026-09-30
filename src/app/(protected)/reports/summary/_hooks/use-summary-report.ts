"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchSummaryReport } from "../services/summary-report.service";
import type { SummaryReportParams } from "../types";

/**
 * The cross-domain summary for a date range and grouping.
 *
 * Keyed on the filters so a range or grouping change is its own cache entry
 * rather than a refetch of the same key — flipping back to a previously
 * viewed combination shows it instantly from cache instead of re-hitting the
 * network.
 */
export function useSummaryReport(params: SummaryReportParams = {}) {
  return useQuery({
    queryKey: ["summary-report", params] as const,
    queryFn: ({ signal }) => fetchSummaryReport(params, { signal }),
    staleTime: 60 * 1000,
  });
}
