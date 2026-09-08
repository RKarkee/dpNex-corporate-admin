"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchConsignmentBillingSummary } from "../services/consignment-billing.service";

/**
 * Headline billing figures for one consignment, fetched once per tab visit.
 *
 * `staleTime` matches `useBillingSummary`: a snapshot, not a live ledger.
 */
export function useConsignmentBillingSummary(consignmentId: number | string) {
  return useQuery({
    queryKey: ["consignment-billing-summary", consignmentId] as const,
    queryFn: ({ signal }) => fetchConsignmentBillingSummary(consignmentId, signal),
    enabled: consignmentId !== undefined && consignmentId !== "",
    staleTime: 60 * 1000,
  });
}
