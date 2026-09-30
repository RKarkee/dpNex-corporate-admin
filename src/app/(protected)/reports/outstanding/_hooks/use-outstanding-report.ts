"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchOutstandingReport } from "../services/outstanding-report.service";
import type { OutstandingReportParams } from "../types";

/**
 * The outstanding-balances report for a date range.
 *
 * Keyed on the filters so a range change is its own cache entry rather than
 * a refetch of the same key — flipping back to a previously viewed range
 * shows it instantly from cache instead of re-hitting the network.
 */
export function useOutstandingReport(params: OutstandingReportParams = {}) {
  return useQuery({
    queryKey: ["outstanding-report", params] as const,
    queryFn: ({ signal }) => fetchOutstandingReport(params, { signal }),
    staleTime: 60 * 1000,
  });
}
