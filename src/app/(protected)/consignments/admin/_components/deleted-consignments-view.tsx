"use client";

import * as React from "react";
import { Trash2, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Pagination } from "@/shared/components/ui/pagination";
import { ConsignmentAdminFilters } from "@/shared/components/consignment-filters/admin-filters";
import {
  countActiveFilters,
  toApiFilters,
  useConsignmentAdminFilters,
} from "@/shared/components/consignment-filters/admin-filter-params";

import {
  useDeletedConsignments,
  useRestoreConsignment,
} from "../_hooks/use-deleted-consignments";
import type { ConsignmentListItem } from "../types";
import { DeletedConsignmentsTable } from "./deleted-consignments-table";
import { ConsignmentsTableSkeleton, trackingId } from "./consignments-table";

/**
 * The landing page's Deleted tab: soft-deleted consignments with Restore as the
 * only action. Its own URL-backed filters (prefix `cd_`), independent of the
 * live list.
 */
export function DeletedConsignmentsView() {
  const { filters, page, perPage, setFilters, reset, setPage, setPerPage } =
    useConsignmentAdminFilters("cd_");
  const apiFilters = React.useMemo(() => toApiFilters(filters), [filters]);
  const hasFilters = countActiveFilters(filters) > 0;

  const [pendingRestore, setPendingRestore] =
    React.useState<ConsignmentListItem | null>(null);

  const { data, isPending, isError, error, isFetching, refetch } =
    useDeletedConsignments(page, apiFilters, perPage);
  const restore = useRestoreConsignment();

  const items = data?.items ?? [];

  const handleConfirmRestore = React.useCallback(async () => {
    if (!pendingRestore) return;
    await restore.mutateAsync(pendingRestore.id);
    if (items.length === 1 && page > 1) setPage(page - 1);
  }, [pendingRestore, restore, items.length, page, setPage]);

  const filterBar = (
    <ConsignmentAdminFilters
      value={filters}
      onChange={setFilters}
      onReset={reset}
      perPage={perPage}
      onPerPageChange={setPerPage}
    />
  );

  if (isPending) {
    return (
      <>
        {filterBar}
        <ConsignmentsTableSkeleton />
      </>
    );
  }

  if (isError) {
    return (
      <>
        {filterBar}
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" strokeWidth={2} />
          </span>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            Could not load deleted consignments
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {isApiError(error)
              ? error.message
              : "Something went wrong. Please try again."}
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </Card>
      </>
    );
  }

  if (items.length === 0 && !hasFilters) {
    return (
      <>
        {filterBar}
        <EmptyState
          icon={Trash2}
          title="No deleted consignments"
          description="Consignments you delete land here, where they can be restored."
        />
      </>
    );
  }

  return (
    <>
      {filterBar}

      <Card>
        <CardContent className="p-0">
          <div
            className={isFetching ? "opacity-60 transition-opacity" : undefined}
          >
            <DeletedConsignmentsTable
              consignments={items}
              onRestore={setPendingRestore}
              restoringId={
                restore.isPending ? (restore.variables ?? null) : null
              }
            />
          </div>

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
        open={pendingRestore !== null}
        onOpenChange={(open) => !open && setPendingRestore(null)}
        title="Restore this consignment?"
        description={
          pendingRestore ? (
            <>
              <span className="font-medium text-foreground">
                {trackingId(pendingRestore)}
              </span>{" "}
              will move back to the Consignments list.
            </>
          ) : null
        }
        confirmLabel="Restore"
        tone="default"
        onConfirm={handleConfirmRestore}
      />
    </>
  );
}
