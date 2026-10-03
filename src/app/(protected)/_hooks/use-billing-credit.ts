"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchBillingCredit } from "../_services/billing-credit.service";

/**
 * Key for the credit position. Exported so a mutation that spends credit
 * (creating a consignment, approving charges) can invalidate it and the header
 * updates without waiting for the next refetch.
 */
export const billingCreditKeys = {
  all: ["billing", "credit"] as const,
};

/**
 * The corporate's credit limit, used and available amounts — read by the
 * header widget on every page.
 *
 * A minute's staleness is fine for a glance figure, and refetching on window
 * focus catches spending done in another tab. No retry: a failure just hides
 * the widget, and retrying a 403 three times on every page load is wasted work.
 */
export function useBillingCredit() {
  return useQuery({
    queryKey: billingCreditKeys.all,
    queryFn: ({ signal }) => fetchBillingCredit(signal),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}
