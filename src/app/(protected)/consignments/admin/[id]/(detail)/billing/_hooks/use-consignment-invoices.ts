"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listConsignmentInvoices } from "../services/consignment-billing.service";

/**
 * One page of `/corporate/consignments/{consignmentId}/billings`.
 *
 * No `search` param: filtering happens in the browser over the rows this
 * page already returned — same choice `useInvoices` makes for the
 * corporate-wide list.
 */
export function useConsignmentInvoices(consignmentId: number | string, page: number, perPage = 15) {
  return useQuery({
    queryKey: ["consignment-billings", consignmentId, { page, perPage }] as const,
    queryFn: ({ signal }) => listConsignmentInvoices({ consignmentId, page, perPage, signal }),
    enabled: consignmentId !== undefined && consignmentId !== "",
    placeholderData: keepPreviousData,
  });
}
