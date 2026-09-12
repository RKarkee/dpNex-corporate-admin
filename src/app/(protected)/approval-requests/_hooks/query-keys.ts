import type { ApprovalFilterValues } from "../types";

/**
 * Every cache key in this feature, in one place.
 *
 * They nest so invalidating a prefix invalidates everything beneath it:
 *
 *   ["approval-requests"]                        → the whole feature
 *   ["approval-requests", "list", { page, … }]   → one page of the table
 *   ["approval-requests", id]                    → everything about one request
 *   ["approval-requests", id, "detail"]          → the record
 *
 * The filters are part of the list key, so two different filter sets are two
 * cache entries and going back to a previous set is instant rather than a
 * refetch. Written as functions because getting the nesting wrong is invisible
 * at the call site and obvious here.
 */
export const approvalRequestKeys = {
  all: ["approval-requests"] as const,

  lists: () => [...approvalRequestKeys.all, "list"] as const,
  list: (params: {
    page: number;
    perPage: number;
    filters: ApprovalFilterValues;
  }) => [...approvalRequestKeys.lists(), params] as const,

  request: (id: number | string) => [...approvalRequestKeys.all, id] as const,

  detail: (id: number | string) =>
    [...approvalRequestKeys.request(id), "detail"] as const,
} as const;
