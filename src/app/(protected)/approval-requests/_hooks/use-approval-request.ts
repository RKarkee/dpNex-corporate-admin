"use client";

import { useQuery } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";

import { fetchApprovalRequest } from "../services/approval-request.service";
import { approvalRequestKeys } from "./query-keys";

/**
 * One request, for the detail page.
 *
 * A 404 is an answer, not a failure — the id does not belong to this corporate,
 * or never existed — so it is not retried. Everything else keeps the default
 * retry, since a flaky network deserves a second attempt.
 */
export function useApprovalRequest(id: string | number | undefined) {
  return useQuery({
    queryKey: approvalRequestKeys.detail(id ?? "none"),
    queryFn: ({ signal }) => fetchApprovalRequest(id as string | number, signal),
    enabled: id !== undefined && String(id).trim() !== "",
    retry: (failureCount, error) => {
      if (isApiError(error) && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}
