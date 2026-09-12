"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listApprovalRequests } from "../services/approval-request.service";
import type { ApprovalFilterValues } from "../types";
import { approvalRequestKeys } from "./query-keys";

/**
 * One page of `/corporate/approval-requests`.
 *
 * The filters are part of the query key and go to the API, so a request number
 * matches across the whole list rather than only the page on screen.
 *
 * `keepPreviousData` is what makes paging and filtering feel settled: the
 * table keeps the rows it has while the next answer is in flight instead of
 * collapsing to a skeleton and back. The filter bar applies on submit, so this
 * never fires per keystroke.
 */
export function useApprovalRequests(
  page: number,
  filters: ApprovalFilterValues,
  perPage = 15,
) {
  return useQuery({
    queryKey: approvalRequestKeys.list({ page, perPage, filters }),
    queryFn: ({ signal }) =>
      listApprovalRequests({ page, perPage, ...filters, signal }),
    placeholderData: keepPreviousData,
  });
}
