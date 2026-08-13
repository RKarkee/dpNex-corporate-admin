"use client";

import { useQuery } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";

import { fetchConsignmentRequest } from "../services/consignment-request.service";
import { consignmentRequestKeys } from "./query-keys";

/**
 * One consignment request, for the detail and edit pages.
 *
 * A 404 is a final answer, not a blip — the id is wrong, deleted, or belongs
 * to another corporate — so it is not retried. Everything else keeps the
 * client's default retry policy.
 */
export function useConsignmentRequest(id: number) {
  return useQuery({
    queryKey: consignmentRequestKeys.detail(id),
    queryFn: ({ signal }) => fetchConsignmentRequest(id, signal),
    enabled: Number.isFinite(id) && id > 0,
    retry: (failureCount, error) => {
      if (isApiError(error) && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}
