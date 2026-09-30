"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchRequestReport } from "../services/request-report.service";
import type { RequestReportParams } from "../types";

/**
 * The consignment request report for a date range.
 *
 * Keyed on the filters so a range change is its own cache entry rather than
 * a refetch of the same key — flipping back to a previously viewed range
 * shows it instantly from cache instead of re-hitting the network.
 */
export function useRequestReport(params: RequestReportParams = {}) {
  return useQuery({
    queryKey: ["request-report", params] as const,
    queryFn: ({ signal }) => fetchRequestReport(params, { signal }),
    staleTime: 60 * 1000,
  });
}
