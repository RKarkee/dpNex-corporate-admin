"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listConsignmentRequests } from "../services/consignment-request.service";
import { consignmentRequestKeys } from "./query-keys";

/**
 * One page of `/corporate/consignmentrequests`.
 *
 * `search` is part of the query key and goes to the API, so a term matches
 * across the whole list rather than only the page already on screen. Pass it
 * debounced — the key changes on every distinct value, and each new key is a
 * request.
 *
 * `keepPreviousData` is what makes both paging and searching feel settled: the
 * table keeps the rows it has while the next answer is in flight, instead of
 * collapsing to a skeleton and back on every keystroke.
 */
export function useConsignmentRequests(
  page: number,
  filters: Record<string, any> = {},
  perPage = 15,
) {
  return useQuery({
    queryKey: consignmentRequestKeys.list({ page, perPage, filters }),
    queryFn: ({ signal }) =>
      listConsignmentRequests({ page, perPage, filters, signal }),
    placeholderData: keepPreviousData,
  });
}
