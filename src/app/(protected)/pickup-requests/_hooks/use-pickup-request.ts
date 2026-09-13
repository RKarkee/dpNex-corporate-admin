"use client";

import { useQuery } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";

import { fetchPickupRequest } from "../services/pickup-request.service";
import { pickupRequestKeys } from "./query-keys";

/**
 * One pickup, for the detail page.
 *
 * A 404 is an answer, not a failure — the id does not belong to this corporate,
 * or never existed — so it is not retried.
 */
export function usePickupRequest(id: string | number | undefined) {
  return useQuery({
    queryKey: pickupRequestKeys.detail(id ?? "none"),
    queryFn: ({ signal }) => fetchPickupRequest(id as string | number, signal),
    enabled: id !== undefined && String(id).trim() !== "",
    retry: (failureCount, error) => {
      if (isApiError(error) && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}
