"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchConsignmentInvoice } from "../services/consignment-billing.service";

/**
 * One invoice, for the detail dialog. `invoiceId` is optional so the dialog
 * can be mounted before a row has been selected — hooks cannot be called
 * conditionally, and `enabled` keeps a missing id from ever reaching the
 * network.
 */
export function useConsignmentInvoice(
  consignmentId: number | string,
  invoiceId: number | string | undefined,
) {
  return useQuery({
    queryKey: ["consignment-billings", consignmentId, "detail", invoiceId ?? 0] as const,
    queryFn: ({ signal }) => fetchConsignmentInvoice(consignmentId, invoiceId as number | string, signal),
    enabled: invoiceId !== undefined && invoiceId !== "",

    // Opening the dialog is asking the server a question, not asking for a
    // minute-old cached guess — same reasoning as `useInvoice`.
    staleTime: 0,
    refetchOnMount: "always",
  });
}
