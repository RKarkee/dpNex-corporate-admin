"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchConsignmentInvoiceAdjustments } from "../services/consignment-billing.service";

/**
 * The adjustments approved against one bill — `.../adjustments`. No embedded
 * field on the invoice detail read backs this one (`amounts.adjustments` is
 * only the summed total), so unlike the particulars/payments hooks there is
 * nothing for the page to fall back to while this is in flight.
 */
export function useConsignmentInvoiceAdjustments(
  consignmentId: number | string,
  invoiceId: number | string | undefined,
) {
  return useQuery({
    queryKey: ["consignment-billings", consignmentId, "detail", invoiceId ?? 0, "adjustments"] as const,
    queryFn: ({ signal }) =>
      fetchConsignmentInvoiceAdjustments(consignmentId, invoiceId as number | string, signal),
    enabled: invoiceId !== undefined && invoiceId !== "",

    // Opening the page is asking the server a question, not asking for a
    // minute-old cached guess — same reasoning as `useConsignmentInvoice`.
    staleTime: 0,
    refetchOnMount: "always",
  });
}
