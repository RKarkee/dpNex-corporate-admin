"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchInvoice } from "@/app/(protected)/billing-accounts/services/billing-invoices.service";

/**
 * One invoice, for the detail page.
 *
 * The key sits under the same `["billing-invoices"]` prefix the list uses,
 * so a bare-prefix invalidation (once a write exists for this resource) would
 * refresh this record too.
 *
 * `id` is optional so the page can call the hook before it has decided the
 * URL segment is usable — hooks cannot be called conditionally, and `enabled`
 * keeps a bad id from ever reaching the network.
 */
export function useInvoice(id: number | string | undefined) {
  return useQuery({
    queryKey: ["billing-invoices", "detail", id ?? 0],
    queryFn: ({ signal }) => fetchInvoice(id as number | string, signal),
    enabled: id !== undefined && id !== "",

    /**
     * Always hit `GET /corporate/billing/invoices/{id}` when this page opens.
     *
     * Same reasoning as `useUser`: someone opening an invoice to inspect it is
     * asking the server a question, not asking for a minute-old cached guess.
     */
    staleTime: 0,
    refetchOnMount: "always",
  });
}
