"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listInvoices } from "@/app/(protected)/billing-accounts/services/billing-invoices.service";

/**
 * One page of `/corporate/billing/invoices`.
 *
 * No `search` param: the list is filtered in the browser, over the rows this
 * page already returned — same choice `useUsers` makes, for the same reason.
 */
export function useInvoices(page: number, perPage = 15) {
  return useQuery({
    queryKey: ["billing-invoices", { page, perPage }] as const,
    queryFn: ({ signal }) => listInvoices({ page, perPage, signal }),
    // Without this the table empties on every page change and the layout
    // jumps between the old rows and the skeleton.
    placeholderData: keepPreviousData,
  });
}
