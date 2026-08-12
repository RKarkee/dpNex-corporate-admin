"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";

import type { PageMeta } from "@/shared/api/types";
import { displayName, roleLabel, type User } from "@/shared/auth/types";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Pagination } from "@/shared/components/ui/pagination";

import { useDeleteUser } from "../_hooks/use-delete-user";
import { useUsers } from "../_hooks/use-users";
import { UsersErrorState } from "./users-error-state";
import { UsersStats } from "./users-stats";
import { UsersTable, UsersTableSkeleton } from "./users-table";

/**
 * Does this row match what was typed?
 *
 * Everything the table can show is searchable — name, email, phone and role
 * labels — so a term the user can see on screen always finds its row. Compared
 * lower-case; `term` arrives already lowered and trimmed.
 */
function matches(user: User, term: string): boolean {
  const haystack: string[] = [
    displayName(user),
    user.email,
    user.phone ?? "",
    ...(user.roles ?? []).map(roleLabel),
  ];

  return haystack.some((value) => value.toLowerCase().includes(term));
}

/**
 * A `meta` block describing the filtered rows rather than the fetched page.
 *
 * The server counted the whole page; once rows are hidden in the browser,
 * "Showing 1–15 of 15" over four visible rows is simply wrong.
 */
function filteredMeta(count: number): PageMeta {
  return {
    page: 1,
    pageCount: 1,
    perPage: count,
    total: count,
    from: count === 0 ? null : 1,
    to: count === 0 ? null : count,
  };
}

/**
 * The directory: stat cards, the table, and the four states it can be in.
 *
 * Page number is local state rather than a URL param — nothing links into a
 * specific page yet, and a query string would need parsing and clamping for no
 * benefit. Move it to the URL the moment a row becomes deep-linkable.
 */
export function UsersView() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [pendingDelete, setPendingDelete] = React.useState<User | null>(null);

  const { data, isPending, isError, error, isFetching, refetch } = useUsers(page);
  const deleteUser = useDeleteUser();

  const term = search.trim().toLowerCase();

  // Filtered in the browser, so there is nothing to debounce — every keystroke
  // is a re-render, not a request.
  const visible = React.useMemo(() => {
    const items = data?.items ?? [];
    return term ? items.filter((user) => matches(user, term)) : items;
  }, [data?.items, term]);

  // The dialog owns the confirmation; this only performs it. Declared before
  // the early returns so the hook order stays stable across every state.
  const handleConfirmDelete = React.useCallback(async () => {
    if (!pendingDelete) return;

    await deleteUser.mutateAsync(pendingDelete.id);

    // Removing the only row on a trailing page would otherwise leave the user
    // staring at an empty table. Decided here, where the row count is known,
    // rather than reacting to the refetched `meta` one render later.
    if (data?.items.length === 1 && page > 1) setPage(page - 1);
  }, [pendingDelete, deleteUser, data?.items.length, page]);

  if (isPending) return <UsersTableSkeleton />;

  if (isError) {
    return <UsersErrorState error={error} onRetry={() => void refetch()} />;
  }

  // Only when the directory itself is empty. A search that matches nothing is
  // not the same situation, and "Add your first team member" would be a lie —
  // that case gets a "no match" row inside the table instead.
  if (data.items.length === 0 && !term) {
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

      {/* One shell around search, table and pagination — the same layout the
          roles list uses. */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users…"
                aria-label="Search users"
                className="h-10 pl-9"
              />
            </div>
          </div>

          {/* Dimmed rather than swapped for a skeleton: on a page change the old
              rows are still meaningful, and replacing them makes the page flicker. */}
          <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
            <UsersTable
              users={visible}
              onDelete={setPendingDelete}
              deletingId={deleteUser.isPending ? deleteUser.variables : null}
            />
          </div>

          {/* The same control the roles table uses, so "Showing 1–4 of 4" and
              the page numbers read identically across the app. It renders the
              count even on a single page, which the old users-only control
              hid. While filtering, the server's `meta` describes the unfiltered
              page, so the count is rebuilt from what is actually on screen. */}
          <div className="border-t border-border px-4">
            <Pagination
              meta={term ? filteredMeta(visible.length) : data.meta}
              onPageChange={setPage}
              disabled={isFetching}
            />
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this user?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">
                {displayName(pendingDelete)}
              </span>{" "}
              will lose access to DpNEx immediately, along with the roles
              assigned to them. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete user"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
