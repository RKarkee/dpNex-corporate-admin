"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LifeBuoy, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Pagination } from "@/shared/components/ui/pagination";

import {
  closeRefusalReason,
  useCloseSupportTicket,
} from "../_hooks/use-close-support-ticket";
import { useSupportTickets } from "../_hooks/use-support-tickets";
import {
  buildListQuery,
  DEFAULT_FILTERS,
  hasActiveFilters,
  parseListState,
  type TicketListState,
} from "../lib/ticket-params";
import type { SupportTicket, TicketFilterValues } from "../types";
import { NewTicketButton } from "./new-ticket-button";
import { TicketFilters } from "./ticket-filters";
import { TicketsTable, TicketsTableSkeleton } from "./tickets-table";

/**
 * The support ticket list: filters, table, pagination, and the states it can be
 * in.
 *
 * The URL is the single source of truth for filters and paging. With twenty
 * filters that is not a nicety: a queue someone has narrowed by hand is worth
 * bookmarking and worth sending, and mirrored state would drift from it.
 */
export function TicketsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [pendingClose, setPendingClose] = React.useState<SupportTicket | null>(
    null,
  );
  const [closeError, setCloseError] = React.useState<string | null>(null);

  const { filters, page } = parseListState(searchParams);

  const { data, isPending, isError, error, isFetching, refetch } =
    useSupportTickets(page, filters);

  const closeTicket = useCloseSupportTicket();

  /*
   * `replace`, not `push`: paging a list or tweaking a filter should not bury
   * the page the user arrived from under a dozen history entries.
   */
  const commit = (next: TicketListState) => {
    const query = buildListQuery(next);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // A narrowed result set almost never has the page the user was on.
  const applyFilters = (next: TicketFilterValues) =>
    commit({ filters: next, page: 1 });

  const resetFilters = () => commit({ filters: DEFAULT_FILTERS, page: 1 });

  const handlePageChange = (nextPage: number) =>
    commit({ filters, page: nextPage });

  const askToClose = (ticket: SupportTicket) => {
    setCloseError(null);
    setPendingClose(ticket);
  };

  /**
   * Closing, with the server's refusal shown in place.
   *
   * The UI already gates on RESOLVED, but the server is the authority — a
   * ticket someone else reopened a second ago is still refused, and its
   * sentence ("Only a resolved ticket can be closed.") explains that better
   * than anything generic. Re-thrown so `ConfirmDialog` stays open and the
   * message has somewhere to live.
   */
  const handleConfirmClose = React.useCallback(async () => {
    if (!pendingClose) return;

    try {
      setCloseError(null);
      await closeTicket.mutateAsync(pendingClose.id);
    } catch (error) {
      setCloseError(
        closeRefusalReason(error) ?? "This ticket could not be closed.",
      );
      throw error;
    }
  }, [pendingClose, closeTicket]);

  const items = data?.items ?? [];

  /*
   * The filter bar stays mounted through every state — loading, error and
   * empty included. Tearing down twenty controls on each Apply would lose
   * focus and scroll position, and an error card with no way to change the
   * filters is a dead end.
   */
  const bar = (
    <TicketFilters
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
        <TicketsTableSkeleton />
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
            Could not load support tickets
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

  // Only when the unfiltered list is empty. Filters matching nothing is a
  // different situation and gets a "no match" row inside the table — "raise
  // your first ticket" would be a lie when there are fifty behind a filter.
  if (items.length === 0 && !hasActiveFilters(filters)) {
    return (
      <div className="space-y-6">
        {bar}
        <EmptyState
          icon={LifeBuoy}
          title="No support tickets yet"
          description="Raise one about a shipment, an invoice or anything else, and it will appear here with its status."
          action={<NewTicketButton />}
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
            <TicketsTable
              tickets={items}
              onClose={askToClose}
              closingId={
                closeTicket.isPending ? (closeTicket.variables ?? null) : null
              }
            />
          </div>

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
        open={pendingClose !== null}
        onOpenChange={(open) => !open && setPendingClose(null)}
        title="Close this ticket?"
        tone="default"
        description={
          pendingClose ? (
            <>
              <span className="font-medium text-foreground">
                {pendingClose.ticket_no}
              </span>{" "}
              will be marked closed. Raise a new ticket if the problem comes
              back.
              {closeError ? (
                <span className="mt-2 block text-destructive">{closeError}</span>
              ) : null}
            </>
          ) : null
        }
        confirmLabel="Close ticket"
        onConfirm={handleConfirmClose}
      />
    </div>
  );
}
