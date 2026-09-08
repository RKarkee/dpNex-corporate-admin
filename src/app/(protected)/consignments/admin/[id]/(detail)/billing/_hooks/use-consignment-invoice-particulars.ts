"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchConsignmentInvoiceParticulars } from "../services/consignment-billing.service";

/**
 * A bill's line items, fetched on their own from `.../particulars` rather
 * than read off the invoice detail's embedded `details` array.
 *
 * `invoiceId` is optional for the same reason `useConsignmentInvoice` makes
 * it optional: the detail page can mount before it has decided the id is
 * usable, and `enabled` keeps a missing one from ever reaching the network.
 */
export function useConsignmentInvoiceParticulars(
  consignmentId: number | string,
  invoiceId: number | string | undefined,
) {
  return useQuery({
    queryKey: ["consignment-billings", consignmentId, "detail", invoiceId ?? 0, "particulars"] as const,
    queryFn: ({ signal }) =>
      fetchConsignmentInvoiceParticulars(consignmentId, invoiceId as number | string, signal),
    enabled: invoiceId !== undefined && invoiceId !== "",

    // Opening the page is asking the server a question, not asking for a
    // minute-old cached guess — same reasoning as `useConsignmentInvoice`.
    staleTime: 0,
    refetchOnMount: "always",
  });
}
