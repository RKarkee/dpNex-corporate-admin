"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, Plus, Search, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Pagination } from "@/shared/components/ui/pagination";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { useConsignmentPermissions } from "../_hooks/use-consignment-permissions";
import { useConsignmentRequests } from "../_hooks/use-consignment-requests";
import { useDeleteConsignmentRequest } from "../_hooks/use-save-consignment-request";
import type { ConsignmentRequestListItem } from "../types";
import { RequestsTable, RequestsTableSkeleton } from "./requests-table";

/**
 * The consignment request list: search, table, pagination, and the states it
 * can be in.
 *
 * Search runs on the server. Filtering the fetched page in the browser is
 * cheaper and looks identical on page one, but it can only ever match rows
 * already loaded — a tracking id on page four would appear not to exist. So
 * the term is debounced, sent as a query param, and the API decides.
 *
 * Page and search are local state rather than URL params — nothing links into
 * a filtered page yet, and a query string would need parsing and clamping for
 * no benefit. Move them to the URL the moment a result becomes shareable.
 */
export function RequestsView() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [pendingDelete, setPendingDelete] =
    React.useState<ConsignmentRequestListItem | null>(null);

  // One request per pause in typing, not one per keystroke.
  const debouncedSearch = useDebouncedValue(search);

  const { canCreate, canUpdate, canDelete } = useConsignmentPermissions();

  const { data, isPending, isError, error, isFetching, refetch } =
    useConsignmentRequests(page, debouncedSearch);
  const deleteRequest = useDeleteConsignmentRequest();

  const searching = debouncedSearch.trim().length > 0;

  /**
   * A new term re-pages from the start.
   *
   * Staying on page four while the result set shrinks to one page asks the API
   * for a page that does not exist, and the table comes back empty for a
   * search that actually matched.
   *
   * Adjusted during render rather than in an effect. React re-runs this
   * component immediately with the corrected page and never commits the
   * mismatched pair, so the query is only ever issued once — an effect would
   * render page four, fire that request, then correct itself.
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

    await deleteRequest.mutateAsync(pendingDelete.id);

    // Removing the only row on a trailing page would otherwise leave the user
    // staring at an empty table. Decided here, where the row count is known,
    // rather than reacting to the refetched `meta` one render later.
    if (items.length === 1 && page > 1) setPage(page - 1);
  }, [pendingDelete, deleteRequest, items.length, page]);

  if (isPending) return <RequestsTableSkeleton />;

  if (isError) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" strokeWidth={2} />
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          Could not load consignment requests
        </h3>
        {/* `ApiError.message` is already sanitised; a raw upstream body would
            leak stack traces at 5xx. */}
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
  // different situation, and gets a "no match" row inside the table instead —
  // "create your first request" would be a lie when there are fifty.
  if (items.length === 0 && !searching) {
    return (
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
    );
  }

  return (
    <>
      {/* One shell around search, table and pagination — the same layout the
          users and roles lists use. */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search all requests…"
                aria-label="Search consignment requests"
                className="h-10 pl-9"
              />
            </div>
          </div>

          {/* Dimmed rather than swapped for a skeleton: on a page change or a
              new search the old rows are still meaningful, and replacing them
              makes the page flicker on every keystroke. */}
          <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
            <RequestsTable
              requests={items}
              onDelete={setPendingDelete}
              canUpdate={canCreate}
              canDelete={canDelete}
              deletingId={
                deleteRequest.isPending ? (deleteRequest.variables ?? null) : null
              }
            />
          </div>

          {/* The server counted the filtered set, so `meta` is correct while
              searching too — which is the other half of why search belongs on
              the API rather than in the browser. */}
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
    </>
  );
}
