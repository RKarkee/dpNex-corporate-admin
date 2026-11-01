"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, Plus, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Pagination } from "@/shared/components/ui/pagination";
import { ConsignmentRequestFilters } from "@/shared/components/consignment-filters/request-filters";
import {
  countActiveFilters,
  toApiFilters,
  useConsignmentRequestFilters,
} from "@/shared/components/consignment-filters/request-filter-params";

import { useConsignmentPermissions } from "../_hooks/use-consignment-permissions";
import { useConsignmentRequests } from "../_hooks/use-consignment-requests";
import { useDeleteConsignmentRequest } from "../_hooks/use-save-consignment-request";
import type { ConsignmentRequestListItem } from "../types";
import { RequestsTable, RequestsTableSkeleton } from "./requests-table";
import { UpdateStatusDialog } from "./update-status-dialog";

/**
 * The consignment request list: URL-backed filters (prefix `rf_`, so a refresh
 * or a shared link restores them), the table, pagination, and the states it
 * can be in. All filtering runs on the server, which is also what keeps the
 * pagination meta correct while filtered.
 */
export function RequestsView() {
  const { filters, page, perPage, setFilters, reset, setPage, setPerPage } =
    useConsignmentRequestFilters("rf_");
  const apiFilters = React.useMemo(() => toApiFilters(filters), [filters]);
  const hasFilters = countActiveFilters(filters) > 0;

  const [pendingDelete, setPendingDelete] =
    React.useState<ConsignmentRequestListItem | null>(null);
  const [statusTarget, setStatusTarget] =
    React.useState<ConsignmentRequestListItem | null>(null);

  const { canCreate, canUpdate, canDelete, canUpdateStatus } =
    useConsignmentPermissions();

  const { data, isPending, isError, error, isFetching, refetch } =
    useConsignmentRequests(page, apiFilters, perPage);
  const deleteRequest = useDeleteConsignmentRequest();

  const items = data?.items ?? [];

  const handleConfirmDelete = React.useCallback(async () => {
    if (!pendingDelete) return;
    await deleteRequest.mutateAsync(pendingDelete.id);
    // Removing the only row on a trailing page would leave an empty table.
    if (items.length === 1 && page > 1) setPage(page - 1);
  }, [pendingDelete, deleteRequest, items.length, page, setPage]);

  const filterBar = (
    <ConsignmentRequestFilters
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
        <RequestsTableSkeleton />
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
            Could not load consignment requests
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

  // Only when the list itself is empty. A filter matching nothing gets a
  // "no match" row inside the table instead.
  if (items.length === 0 && !hasFilters) {
    return (
      <>
        {filterBar}
        <EmptyState
          icon={FileText}
          title="No consignment requests yet"
          description="Check rates for a destination and your first request will appear here."
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/consignments/request/create">
                  <Plus className="size-4" />
                  New request
                </Link>
              </Button>
            ) : undefined
          }
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
            <RequestsTable
              requests={items}
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
        title="Delete this consignment request?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">
                {pendingDelete.request_tracking_id}
              </span>{" "}
              and all of its boxes and items will be removed. This cannot be
              undone.
            </>
          ) : null
        }
        confirmLabel="Delete request"
        onConfirm={handleConfirmDelete}
      />

      {statusTarget ? (
        <UpdateStatusDialog
          requestId={statusTarget.id}
          statuses={statusTarget.next_statuses ?? []}
          open
          onOpenChange={(open) => !open && setStatusTarget(null)}
        />
      ) : null}
    </>
  );
}
