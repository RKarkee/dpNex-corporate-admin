"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listBillingAccounts } from "../services/billing-account.service";
import type { BillingAccountFilterValues } from "../types";
import { billingAccountKeys } from "./query-keys";

/**
 * One page of `/corporate/billingaccounts`.
 *
 * `keepPreviousData` keeps the current rows on screen while the next page or
 * filter set is in flight, instead of collapsing to a skeleton and back.
 */
export function useBillingAccounts(
  page: number,
  filters: BillingAccountFilterValues,
  perPage = 15,
) {
  return useQuery({
    queryKey: billingAccountKeys.list({ page, perPage, filters }),
    queryFn: ({ signal }) =>
      listBillingAccounts({ page, perPage, ...filters, signal }),
    placeholderData: keepPreviousData,
  });
}
