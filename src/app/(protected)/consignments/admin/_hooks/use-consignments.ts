"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import {
  checkRates,
  fetchConsignment,
  listConsignments,
} from "../services/consignment-admin.service";
import type { CheckRatesPayload } from "../types";
import { consignmentAdminKeys } from "./query-keys";

/**
 * Reads for the Consignment Admin module.
 *
 * Kept independent of the Consignment Request hooks: same shapes, different
 * resource and different cache root, so sharing them would only couple two
 * things that are free to diverge.
 */

/**
 * One page of `/corporate/consignments`.
 *
 * `search` is part of the query key and goes to the API, so a term matches
 * across the whole list rather than only the page on screen. Pass it debounced —
 * each distinct value is a new key, and each new key is a request.
 *
 * `keepPreviousData` is what makes paging and searching feel settled: the table
 * keeps its rows while the next answer is in flight, instead of collapsing to a
 * skeleton and back on every keystroke.
 */
export function useConsignments(page: number, search = "", perPage = 15) {
  const term = search.trim();

  return useQuery({
    queryKey: consignmentAdminKeys.list({ page, perPage, search: term }),
    queryFn: ({ signal }) =>
      listConsignments({ page, perPage, search: term, signal }),
    placeholderData: keepPreviousData,
  });
}

/**
 * One consignment, for the detail and edit pages.
 *
 * A 404 is a final answer, not a blip — the id is wrong, deleted, or belongs to
 * another corporate — so it is not retried.
 */
export function useConsignment(id: number) {
  return useQuery({
    queryKey: consignmentAdminKeys.detail(id),
    queryFn: ({ signal }) => fetchConsignment(id, signal),
    enabled: Number.isFinite(id) && id > 0,
    retry: (failureCount, error) => {
      if (isApiError(error) && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Fetches quotes for a destination and weight.
 *
 * A mutation rather than a query even though it only reads: it runs when the
 * user submits, not when the page mounts, and it must be re-runnable with the
 * same inputs — a query would serve the cached answer and look like nothing
 * happened.
 *
 * `data` holds the last result, so the page reads rates straight off the
 * mutation rather than mirroring them into state.
 */
export function useCheckRates() {
  return useMutation({
    mutationFn: (payload: CheckRatesPayload) => checkRates(payload),

    onError: (error) => {
      // A 422 is already spelled out field by field under the inputs.
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}
