"use client";

import { useQuery } from "@tanstack/react-query";

import { listUsers } from "@/shared/api/services/users.service";
import { roleLabel, type User } from "@/shared/auth/types";

/**
 * Headline counts for the directory.
 *
 * Fetched separately from the table rather than derived from the page on
 * screen: the list is paginated, so counting the rows in view would report
 * "3 users" on page one of eighty. One wide request answers it honestly.
 *
 * `complete` says whether the sample covered everyone. If a corporate ever
 * grows past `STATS_SAMPLE`, the role breakdown is a floor rather than a
 * total, and the UI must say so instead of quietly under-reporting.
 */
const STATS_SAMPLE = 200;

export interface RoleCount {
  id: number;
  label: string;
  count: number;
}

export interface UserStats {
  /** From the API's own `meta.total` — accurate regardless of the sample. */
  total: number;
  active: number;
  roles: RoleCount[];
  complete: boolean;
}

function summarise(users: User[], total: number): UserStats {
  const roles = new Map<number, RoleCount>();

  for (const user of users) {
    for (const role of user.roles ?? []) {
      const existing = roles.get(role.id);
      if (existing) {
        existing.count += 1;
        continue;
      }
      roles.set(role.id, { id: role.id, label: roleLabel(role), count: 1 });
    }
  }

  return {
    total,
    active: users.filter((user) => user.disabled !== "Y").length,
    roles: [...roles.values()].sort((a, b) => b.count - a.count),
    complete: users.length >= total,
  };
}

export function useUserStats() {
  return useQuery({
    queryKey: ["users", "stats"] as const,
    queryFn: async ({ signal }) => {
      const { items, meta } = await listUsers({
        page: 1,
        perPage: STATS_SAMPLE,
        signal,
      });

      return summarise(items, meta?.total ?? items.length);
    },
    // The cards are context, not the main event — a minute-old count is fine
    // and saves a second full fetch on every return to the page.
    staleTime: 60 * 1000,
  });
}
