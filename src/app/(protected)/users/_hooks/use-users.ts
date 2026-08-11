"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listUsers } from "@/app/(protected)/users/services/users.service";

/**
 * One page of `/corporate/users`.
 *
 * No `search` param: the directory is filtered in the browser, over the rows
 * this page already returned.
 */
export function useUsers(page: number, perPage = 15) {
  return useQuery({
    queryKey: ["users", { page, perPage }] as const,
    queryFn: ({ signal }) => listUsers({ page, perPage, signal }),
    // Without this the table empties on every page change and the layout jumps
    // between the old rows and the skeleton.
    placeholderData: keepPreviousData,
  });
}
