"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { useUsers } from "@/shared/hooks/use-users";

import { UsersErrorState } from "./users-error-state";
import { UsersPagination } from "./users-pagination";
import { UsersStats } from "./users-stats";
import { UsersTable, UsersTableSkeleton } from "./users-table";

/**
 * The directory: stat cards, the table, and the four states it can be in.
 *
 * Page number is local state rather than a URL param — nothing links into a
 * specific page yet, and a query string would need parsing and clamping for no
 * benefit. Move it to the URL the moment a row becomes deep-linkable.
 */
export function UsersView() {
  const [page, setPage] = React.useState(1);
  const { data, isPending, isError, error, isFetching, refetch } = useUsers(page);

  if (isPending) return <UsersTableSkeleton />;

  if (isError) {
    return <UsersErrorState error={error} onRetry={() => void refetch()} />;
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No users yet"
        description="Add your first team member and they will appear here."
        action={
          <Button asChild>
            <Link href="/users/create">
              <Plus className="size-4" />
              Add user
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <UsersStats />

      <div className="space-y-4">
        {/* Dimmed rather than swapped for a skeleton: on a page change the old
            rows are still meaningful, and replacing them makes the page flicker. */}
        <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
          <UsersTable users={data.items} />
        </div>

        <UsersPagination
          page={page}
          meta={data.meta}
          busy={isFetching}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
