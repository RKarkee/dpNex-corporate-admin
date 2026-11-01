"use client";

import { useQuery } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";

import { fetchBillingAccount } from "../services/billing-account.service";
import { billingAccountKeys } from "./query-keys";

/**
 * One billing account, for the detail page.
 *
 * A 404 is an answer — the id is not this corporate's, or never existed — so
 * it is not retried.
 */
export function useBillingAccount(id: string | number | undefined) {
  return useQuery({
    queryKey: billingAccountKeys.detail(id ?? "none"),
    queryFn: ({ signal }) => fetchBillingAccount(id as string | number, signal),
    enabled: id !== undefined && String(id).trim() !== "",
    retry: (failureCount, error) => {
      if (isApiError(error) && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}
