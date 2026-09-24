"use client";

import * as React from "react";
import { Trash2, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Pagination } from "@/shared/components/ui/pagination";

import {
  useDeletedConsignmentRequests,
  useRestoreConsignmentRequest,
} from "../_hooks/use-deleted-consignment-requests";
import type { ConsignmentRequestListItem } from "../types";
import { DeletedRequestsTable } from "./deleted-requests-table";
import { RequestsTableSkeleton } from "./requests-table";

/**
 * The landing page's Deleted tab: soft-deleted requests with Restore as the
 * only action. Its own page state, so each tab keeps its own place.
 */
export function DeletedRequestsView() {
  const [page, setPage] = React.useState(1);
  const [pendingRestore, setPendingRestore] =
    React.useState<ConsignmentRequestListItem | null>(null);

  const { data, isPending, isError, error, isFetching, refetch } =
    useDeletedConsignmentRequests(page);
  const restore = useRestoreConsignmentRequest();

  const items = data?.items ?? [];

  const handleConfirmRestore = React.useCallback(async () => {
    if (!pendingRestore) return;

    await restore.mutateAsync(pendingRestore.id);

    // Restoring the only row on a trailing page would leave an empty page.
    if (items.length === 1 && page > 1) setPage(page - 1);
  }, [pendingRestore, restore, items.length, page]);

  if (isPending) return <RequestsTableSkeleton />;

  if (isError) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" strokeWidth={2} />
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          Could not load deleted requests
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {isApiError(error) ? error.message : "Something went wrong. Please try again."}
        </p>
        <Button variant="outline" className="mt-6" onClick={() => void refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Trash2}
        title="No deleted requests"
        description="Requests you delete land here, where they can be restored."
      />
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
            <DeletedRequestsTable
              requests={items}
              onRestore={setPendingRestore}
              restoringId={restore.isPending ? (restore.variables ?? null) : null}
            />
          </div>

          <div className="border-t border-border px-4">
            <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingRestore !== null}
        onOpenChange={(open) => !open && setPendingRestore(null)}
        title="Restore this consignment request?"
        description={
          pendingRestore ? (
            <>
              <span className="font-medium text-foreground">
                {pendingRestore.request_tracking_id || `#${pendingRestore.id}`}
              </span>{" "}
              will move back to the Consignment Requests list.
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
