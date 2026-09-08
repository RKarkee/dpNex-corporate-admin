"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchBillingStatement } from "@/app/(protected)/billing-accounts/services/billing-statement.service";

/** One statement, for a given `[from, to]` range. Both are `YYYY-MM-DD`. */
export function useBillingStatement(from: string, to: string) {
  return useQuery({
    queryKey: ["billing-statement", { from, to }] as const,
    queryFn: ({ signal }) => fetchBillingStatement({ from, to, signal }),
    enabled: Boolean(from) && Boolean(to),
  });
}
