"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchConsignmentInvoicePayments } from "../services/consignment-billing.service";

/**
 * The payments applied to one bill, fetched on their own from
 * `.../payments` rather than read off the invoice detail's embedded
 * `allocations` array — same relationship `useConsignmentInvoiceParticulars`
 * has to `invoice.details`.
 */
export function useConsignmentInvoicePayments(
  consignmentId: number | string,
  invoiceId: number | string | undefined,
) {
  return useQuery({
    queryKey: ["consignment-billings", consignmentId, "detail", invoiceId ?? 0, "payments"] as const,
    queryFn: ({ signal }) =>
      fetchConsignmentInvoicePayments(consignmentId, invoiceId as number | string, signal),
    enabled: invoiceId !== undefined && invoiceId !== "",

    // Opening the page is asking the server a question, not asking for a
    // minute-old cached guess — same reasoning as `useConsignmentInvoice`.
    staleTime: 0,
    refetchOnMount: "always",
  });
}
