"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listPickupRequests } from "../services/pickup-request.service";
import { pickupRequestKeys } from "./query-keys";

/**
 * One page of `/corporate/pickuprequests`.
 *
 * `keepPreviousData` keeps the rows on screen while the next page is in flight,
 * rather than collapsing to a skeleton and back on every page change.
 */
export function usePickupRequests(page: number, perPage = 15) {
  return useQuery({
    queryKey: pickupRequestKeys.list({ page, perPage }),
    queryFn: ({ signal }) => listPickupRequests({ page, perPage, signal }),
    placeholderData: keepPreviousData,
  });
}
