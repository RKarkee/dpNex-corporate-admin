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

    /**
     * Always hit `GET /corporate/users/{id}` when one of these pages opens.
     *
     * The app-wide default is `staleTime: 60_000`, which is right for a list
     * but wrong here: opening a user, going back, and opening them again
     * inside a minute served the cache and fired no request at all. Someone
     * clicking a row to *inspect* it is asking the server a question, and
     * after an edit elsewhere the cached copy is exactly the wrong answer.
     *
     * `staleTime: 0` alone is not enough — it marks the data stale, and
     * `refetchOnMount` then decides whether to act on it. Both, explicitly.
     *
     * Cached data still renders while the request is in flight, so this costs
     * a background call, not a spinner: the pages branch on `isLoading`, which
     * is only true when there is nothing to show yet.
     */
    staleTime: 0,
    refetchOnMount: "always",
  });
}
