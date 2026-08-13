"use client";

import * as React from "react";
// Create path is commented out below; restore with the action prop.
// import Link from "next/link";
import { Search, Shield, TriangleAlert } from "lucide-react";
// import { Plus } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Pagination } from "@/shared/components/ui/pagination";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { useConsignmentAdminPermissions } from "../_hooks/use-consignment-admin-permissions";
import { useConsignments } from "../_hooks/use-consignments";
import { useDeleteConsignment } from "../_hooks/use-save-consignment";
import type { ConsignmentListItem } from "../types";
import {
  ConsignmentsTable,
  ConsignmentsTableSkeleton,
} from "./consignments-table";

/**
 * The consignment list: search, table, pagination, and the states it can be in.
 *
 * Search runs on the server. Filtering the fetched page in the browser is
 * cheaper and looks identical on page one, but it can only ever match rows
 * already loaded — a tracking id on page four would appear not to exist. So the
 * term is debounced, sent as a query param, and the API decides.
 */
export function ConsignmentsView() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [pendingDelete, setPendingDelete] =
    React.useState<ConsignmentListItem | null>(null);

  // One request per pause in typing, not one per keystroke.
  const debouncedSearch = useDebouncedValue(search);

  // `canCreate` is unused while the create path is commented out.
  const { canUpdate, canDelete } = useConsignmentAdminPermissions();

  const { data, isPending, isError, error, isFetching, refetch } =
    useConsignments(page, debouncedSearch);
  const deleteConsignment = useDeleteConsignment();

  const searching = debouncedSearch.trim().length > 0;

  /**
   * A new term re-pages from the start.
   *
   * Adjusted during render rather than in an effect. React re-runs this
   * component immediately with the corrected page and never commits the
   * mismatched pair, so the query is only issued once — an effect would render
   * page four, fire that request, then correct itself.
   */
  const [pagedFor, setPagedFor] = React.useState(debouncedSearch);
  if (pagedFor !== debouncedSearch) {
    setPagedFor(debouncedSearch);
    setPage(1);
  }

  const items = data?.items ?? [];

  // Declared before the early returns so hook order stays stable across states.
  const handleConfirmDelete = React.useCallback(async () => {
    if (!pendingDelete) return;

    await deleteConsignment.mutateAsync(pendingDelete.id);

    // Removing the only row on a trailing page would otherwise leave the user
    // staring at an empty table. Decided here, where the row count is known.
    if (items.length === 1 && page > 1) setPage(page - 1);
  }, [pendingDelete, deleteConsignment, items.length, page]);

  if (isPending) return <ConsignmentsTableSkeleton />;

  if (isError) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" strokeWidth={2} />
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          Could not load consignments
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {isApiError(error)
            ? error.message
            : "Something went wrong. Please try again."}
        </p>
        <Button variant="outline" className="mt-6" onClick={() => void refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  // Only when the list itself is empty. A search matching nothing is a
  // different situation, and gets a "no match" row inside the table instead.
  if (items.length === 0 && !searching) {
    return (
      <EmptyState
        icon={Shield}
        title="No consignments yet"
        description="Check rates for a destination and your first consignment will appear here."
        // action={
        //   canCreate ? (
        //     <Button asChild>
        //       <Link href="/consignments/admin/new">
        //         <Plus className="size-4" />
        //         New consignment
        //       </Link>
        //     </Button>
        //   ) : undefined
        // }
      />
    );
  }

  return (
    <>
      {/* One shell around search, table and pagination — the same layout the
          users, roles and request lists use. */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search all consignments…"
                aria-label="Search consignments"
                className="h-10 pl-9"
              />
            </div>
          </div>

          {/* Dimmed rather than swapped for a skeleton: on a page change or a
              new search the old rows are still meaningful. */}
          <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
            <ConsignmentsTable
              consignments={items}
              onDelete={setPendingDelete}
              canUpdate={canUpdate}
              canDelete={canDelete}
              deletingId={
                deleteConsignment.isPending
                  ? (deleteConsignment.variables ?? null)
                  : null
              }
            />
          </div>

          {/* The server counted the filtered set, so `meta` is correct while
              searching too — the other half of why search belongs on the API. */}
          <div className="border-t border-border px-4">
            <Pagination
              meta={data.meta}
              onPageChange={setPage}
              disabled={isFetching}
            />
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this consignment?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">
                {pendingDelete.request_tracking_id ??
                  pendingDelete.tracking_number ??
                  `#${pendingDelete.id}`}
              </span>{" "}
              and all of its boxes and items will be removed. This cannot be
              undone.
            </>
          ) : null
        }
        confirmLabel="Delete consignment"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
