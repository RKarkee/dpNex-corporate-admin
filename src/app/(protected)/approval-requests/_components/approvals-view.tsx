"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardCheck, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Pagination } from "@/shared/components/ui/pagination";

import { useApprovalPermissions } from "../_hooks/use-approval-permissions";
import { useApprovalRequests } from "../_hooks/use-approval-requests";
import { useCancelApprovalRequest } from "../_hooks/use-cancel-approval-request";
import {
  buildListQuery,
  DEFAULT_FILTERS,
  isDefaultView,
  parseListState,
  type ApprovalListState,
} from "../lib/approval-params";
import type { ApprovalFilterValues, ApprovalRequest } from "../types";
import { ApprovalFilters } from "./approval-filters";
import { ApprovalsTable, ApprovalsTableSkeleton } from "./approvals-table";
import { NewRequestButton } from "./new-request-button";

/**
 * The approval request list: filters, table, pagination, and the states it can
 * be in.
 *
 * The URL is the single source of truth for filters and paging — no mirrored
 * state to drift from it. A refresh, a bookmark, a shared link and the Back
 * button all restore the same view, and the query key is derived straight from
 * what is on screen. Unlike the consignment list, a filtered queue here is
 * worth sending someone, which is what pays for the extra plumbing.
 */
export function ApprovalsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [pendingCancel, setPendingCancel] =
    React.useState<ApprovalRequest | null>(null);

  const { filters, page } = parseListState(searchParams);

  const { data, isPending, isError, error, isFetching, refetch } =
    useApprovalRequests(page, filters);

  const { canCancel } = useApprovalPermissions();
  const cancelRequest = useCancelApprovalRequest();

  /*
   * `replace`, not `push`: paging a list or tweaking a filter should not bury
   * the page the user arrived from under a dozen history entries.
   * `scroll: false` keeps the viewport where it is when only the rows change.
   */
  const commit = (next: ApprovalListState) => {
    const query = buildListQuery(next);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // A narrowed result set almost never has the page the user was on.
  const applyFilters = (next: ApprovalFilterValues) =>
    commit({ filters: next, page: 1 });

  const resetFilters = () => commit({ filters: DEFAULT_FILTERS, page: 1 });

  const handlePageChange = (nextPage: number) =>
    commit({ filters, page: nextPage });

  const handleConfirmCancel = React.useCallback(async () => {
    if (!pendingCancel) return;
    // The record survives as CANCELLED and keeps its place in the list, so
    // there is no row to remove and no trailing-page correction to make.
    await cancelRequest.mutateAsync(pendingCancel.id);
  }, [pendingCancel, cancelRequest]);

  const items = data?.items ?? [];

  /*
   * The filter bar stays mounted through every state — loading, error and
   * empty included. Tearing down nine controls on each Apply would lose focus
   * and scroll position, and an error card with no way to change the filters
   * is a dead end.
   */
  const bar = (
    <ApprovalFilters
      value={filters}
      onApply={applyFilters}
      onReset={resetFilters}
      disabled={isPending}
    />
  );

  if (isPending) {
    return (
      <div className="space-y-6">
        {bar}
        <ApprovalsTableSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        {bar}
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" strokeWidth={2} />
          </span>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            Could not load approval requests
          </h3>
          {/* `ApiError.message` is already sanitised; a raw upstream body would
              leak stack traces at 5xx. */}
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
      </div>
    );
  }

  // Only when the default view itself is empty. Filters matching nothing is a
  // different situation and gets a "no match" row inside the table — "raise
  // your first request" would be a lie when there are fifty behind a filter.
  if (items.length === 0 && isDefaultView(filters)) {
    return (
      <div className="space-y-6">
        {bar}
        <EmptyState
          icon={ClipboardCheck}
          title="No requests awaiting approval"
          description="Ask for a credit-limit increase, a discount on a consignment, or an update to your details — they will appear here while they wait for a decision."
          action={<NewRequestButton />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bar}

      <Card>
        <CardContent className="p-0">
          {/* Dimmed rather than swapped for a skeleton: on a page change the
              old rows are still meaningful, and replacing them makes the page
              flicker. */}
          <div
            className={isFetching ? "opacity-60 transition-opacity" : undefined}
          >
            <ApprovalsTable
              requests={items}
              onCancel={setPendingCancel}
              canCancel={canCancel}
              cancellingId={
                cancelRequest.isPending ? (cancelRequest.variables ?? null) : null
              }
            />
          </div>

          {/* The server counted the filtered set, so `meta` is correct while
              filtering too — which is the other half of why filtering belongs
              on the API rather than in the browser. */}
          <div className="border-t border-border px-4">
            <Pagination
              meta={data.meta}
              onPageChange={handlePageChange}
              disabled={isFetching}
            />
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingCancel !== null}
        onOpenChange={(open) => !open && setPendingCancel(null)}
        title="Withdraw this request?"
        description={
          pendingCancel ? (
            <>
              <span className="font-medium text-foreground">
                {pendingCancel.request_no}
              </span>{" "}
              will be marked cancelled and nobody will review it. You can raise
              a new request afterwards.
            </>
          ) : null
        }
        confirmLabel="Withdraw request"
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
