"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchUser } from "@/app/(protected)/users/services/users.service";

/**
 * One user, for the detail and edit pages.
 *
 * The key sits under the same `["users"]` prefix the table and stats use, so
 * the bare-prefix invalidation the create, update and delete mutations already
 * do refreshes this record too.
 *
 * `id` is optional so the page can call the hook before it has decided the URL
 * segment is a number — hooks cannot be called conditionally, and `enabled`
 * keeps a bad id from ever reaching the network.
 */
export function useUser(id: number | undefined) {
  return useQuery({
    queryKey: ["users", "detail", id ?? 0],
    queryFn: ({ signal }) => fetchUser(id as number, signal),
    enabled: typeof id === "number" && Number.isFinite(id),
  });
}
