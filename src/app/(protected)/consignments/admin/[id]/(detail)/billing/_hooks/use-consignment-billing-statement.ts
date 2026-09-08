"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchConsignmentBillingStatement } from "../services/consignment-billing.service";

/** One statement, for a given `[from, to]` range. Both are `YYYY-MM-DD`. */
export function useConsignmentBillingStatement(consignmentId: number | string, from: string, to: string) {
  return useQuery({
    queryKey: ["consignment-billing-statement", consignmentId, { from, to }] as const,
    queryFn: ({ signal }) => fetchConsignmentBillingStatement({ consignmentId, from, to, signal }),
    enabled: Boolean(consignmentId) && Boolean(from) && Boolean(to),
  });
}
