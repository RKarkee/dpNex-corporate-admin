"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchBillingReport } from "../services/billing-report.service";
import type { BillingReportParams } from "../types";

/**
 * The billing report for a date range.
 *
 * Keyed on the filters so a range change is its own cache entry rather than
 * a refetch of the same key — flipping back to a previously viewed range
 * shows it instantly from cache instead of re-hitting the network.
 */
export function useBillingReport(params: BillingReportParams = {}) {
  return useQuery({
    queryKey: ["billing-report", params] as const,
    queryFn: ({ signal }) => fetchBillingReport(params, { signal }),
    staleTime: 60 * 1000,
  });
}
