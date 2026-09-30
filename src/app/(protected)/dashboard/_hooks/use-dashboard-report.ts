"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchDashboardReport } from "../services/dashboard.service";
import type { DashboardReportParams } from "../types";

/**
 * The dashboard for a date range.
 *
 * Keyed on the filters so a range change is its own cache entry rather than
 * a refetch of the same key — flipping back to a previously viewed range
 * shows it instantly from cache instead of re-hitting the network.
 */
export function useDashboardReport(params: DashboardReportParams = {}) {
  return useQuery({
    queryKey: ["dashboard-report", params] as const,
    queryFn: ({ signal }) => fetchDashboardReport(params, { signal }),
    staleTime: 60 * 1000,
  });
}
