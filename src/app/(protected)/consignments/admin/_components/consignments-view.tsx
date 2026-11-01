"use client";

import * as React from "react";
import { Shield, TriangleAlert } from "lucide-react";

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

import { useConsignmentAdminPermissions } from "../_hooks/use-consignment-admin-permissions";
import { useConsignments } from "../_hooks/use-consignments";
import { useDeleteConsignment } from "../_hooks/use-save-consignment";
import type { ConsignmentListItem } from "../types";
import {
  ConsignmentsTable,
  ConsignmentsTableSkeleton,
} from "./consignments-table";
import { UpdateStatusDialog } from "./update-status-dialog";

/**
 * The admin consignment list: URL-backed filters (prefix `cf_`), the table,
 * pagination, and the states it can be in. All filtering runs on the server.
 */
export function ConsignmentsView() {
  const { filters, page, perPage, setFilters, reset, setPage, setPerPage } =
    useConsignmentAdminFilters("cf_");
  const apiFilters = React.useMemo(() => toApiFilters(filters), [filters]);
  const hasFilters = countActiveFilters(filters) > 0;

  const [pendingDelete, setPendingDelete] =
    React.useState<ConsignmentListItem | null>(null);
  const [statusTarget, setStatusTarget] =
    React.useState<ConsignmentListItem | null>(null);

  const { canUpdate, canDelete, canUpdateStatus } =
    useConsignmentAdminPermissions();
  const { data, isPending, isError, error, isFetching, refetch } =
    useConsignments(page, apiFilters, perPage);
  const deleteConsignment = useDeleteConsignment();

  const items = data?.items ?? [];

  const handleConfirmDelete = React.useCallback(async () => {
    if (!pendingDelete) return;
    await deleteConsignment.mutateAsync(pendingDelete.id);
    if (items.length === 1 && page > 1) setPage(page - 1);
  }, [pendingDelete, deleteConsignment, items.length, page, setPage]);

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
            Could not load consignments
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
          icon={Shield}
          title="No consignments yet"
          description="Check rates for a destination and your first consignment will appear here."
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
            <ConsignmentsTable
              consignments={items}
              onDelete={setPendingDelete}
              onUpdateStatus={setStatusTarget}
              canUpdate={canUpdate}
              canDelete={canDelete}
              canUpdateStatus={canUpdateStatus}
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

      {statusTarget ? (
        <UpdateStatusDialog
          consignmentId={statusTarget.id}
          statuses={statusTarget.next_statuses ?? []}
          open
          onOpenChange={(open) => !open && setStatusTarget(null)}
        />
      ) : null}
    </>
  );
}
