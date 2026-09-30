"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchCustomerReport } from "../services/customer-report.service";
import type { CustomerReportParams } from "../types";

/**
 * The customer report for a date range.
 *
 * Keyed on the filters so a range change is its own cache entry rather than
 * a refetch of the same key — flipping back to a previously viewed range
 * shows it instantly from cache instead of re-hitting the network.
 */
export function useCustomerReport(params: CustomerReportParams = {}) {
  return useQuery({
    queryKey: ["customer-report", params] as const,
    queryFn: ({ signal }) => fetchCustomerReport(params, { signal }),
    staleTime: 60 * 1000,
  });
}
