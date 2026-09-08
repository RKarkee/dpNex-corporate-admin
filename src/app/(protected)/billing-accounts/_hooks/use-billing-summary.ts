"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchBillingSummary } from "@/app/(protected)/billing-accounts/services/billing-summary.service";

/**
 * Headline billing figures, fetched once for the summary page.
 *
 * `staleTime` matches `useUserStats`: these numbers are a snapshot, not a
 * live ledger, so a minute-old view is fine and saves a re-fetch on every
 * return to the page.
 */
export function useBillingSummary() {
  return useQuery({
    queryKey: ["billing-summary"] as const,
    queryFn: ({ signal }) => fetchBillingSummary(signal),
    staleTime: 60 * 1000,
  });
}
