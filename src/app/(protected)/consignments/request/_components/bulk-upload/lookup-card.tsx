"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, AlertCircle, Download, Loader2, RefreshCw, Rows3, Search, X } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";

import {
  useBulkUploadBatch,
  useBulkUploadRows,
  useDownloadBulkUploadErrorReport,
} from "../../_hooks/use-bulk-upload";
import { consignmentRequestKeys } from "../../_hooks/query-keys";
import { isBatchInProgress } from "../../services/bulk-upload.service";
import { FieldGroup, FieldShell } from "../field-shell";
import { BatchRowsTable } from "./batch-rows-table";
import { BatchSummary } from "./batch-summary";

/** Rows fetched per request; more load as the user scrolls. */
const ROWS_PER_PAGE = 50;

/**
 * Calls `loadMore` when `sentinel` scrolls into view inside `root` (with a
 * little lead so the next page is usually there before the bottom is hit).
 * Re-arms after every page — if a short page leaves the sentinel still in
 * view, the observer fires again straight away and the next page follows.
 */
function useLoadMoreOnScroll(
  root: React.RefObject<HTMLDivElement | null>,
  sentinel: React.RefObject<HTMLDivElement | null>,
  canLoadMore: boolean,
  loadMore: () => void,
  loadedCount: number,
) {
  React.useEffect(() => {
    const rootEl = root.current;
    const target = sentinel.current;
    if (!rootEl || !target || !canLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: rootEl, rootMargin: "0px 0px 160px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [root, sentinel, canLoadMore, loadMore, loadedCount]);
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

const messageOf = (error: unknown, fallback: string) =>
  isApiError(error) ? error.message : fallback;

interface LookupCardProps {
  /** Pre-fills the batch code (the last upload, or ?batch= in the URL) and shows its status and rows. */
  initialBatchCode?: string | null;
  /** Called by "Clear" — the page drops `?batch=` so a refresh doesn't bring the batch back. */
  onClear?: () => void;
}

/**
 * Look up any upload by its batch code. Three separate options:
 * - "Check status" — the batch itself, `GET bulk-upload/{code}` (status,
 *   counts). Re-checks on its own every few seconds while still processing.
 * - "View rows" — each row's result, `GET bulk-upload/{code}/rows`, loaded
 *   page by page as the table is scrolled.
 * - "Download error report" — the batch's error file.
 * - "Clear" — empties the code and removes the status and rows from the card.
 * Nothing loads until asked. Asking about a different code clears whatever is
 * still showing for the old one, so the status and the rows on screen never
 * belong to two different batches.
 */
export function LookupCard({ initialBatchCode, onClear }: LookupCardProps) {
  const queryClient = useQueryClient();
  const [code, setCode] = React.useState(initialBatchCode ?? "");
  /** The batch whose status is on screen — set by "Check status", not by typing. */
  const [statusCode, setStatusCode] = React.useState<string | null>(initialBatchCode || null);
  /** The batch whose rows are on screen — set by "View rows", not by typing. */
  const [rowsCode, setRowsCode] = React.useState<string | null>(initialBatchCode || null);

  // A new batch arriving from outside (an upload, or a ?batch= link) shows both.
  const [seenInitial, setSeenInitial] = React.useState(initialBatchCode ?? null);
  // Once the URL has no batch (e.g. after "Clear" removed it), forget the last
  // one, so the same batch arriving again later shows again. Not reset inside
  // "Clear" itself: for one render after it the URL still holds the old batch,
  // and resetting early would bring that batch straight back.
  if (!initialBatchCode && seenInitial !== null) {
    setSeenInitial(null);
  }
  if (initialBatchCode && initialBatchCode !== seenInitial) {
    setSeenInitial(initialBatchCode);
    setCode(initialBatchCode);
    setStatusCode(initialBatchCode);
    setRowsCode(initialBatchCode);
  }

  const errorReport = useDownloadBulkUploadErrorReport();
  const batchQuery = useBulkUploadBatch(statusCode);
  const rowsQuery = useBulkUploadRows(rowsCode, ROWS_PER_PAGE);
  const trimmed = code.trim();

  const batch = batchQuery.data;
  const inProgress = isBatchInProgress(batch);

  // When a batch being watched finishes processing, its rows are final too —
  // reload them once so the table isn't left showing the half-done set.
  const wasInProgress = React.useRef(false);
  React.useEffect(() => {
    if (wasInProgress.current && !inProgress && rowsCode && rowsCode === statusCode) {
      void rowsQuery.refetch();
    }
    wasInProgress.current = inProgress;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inProgress]);

  const checkStatus = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!trimmed) return;
    if (statusCode === trimmed) {
      void batchQuery.refetch();
    } else {
      setStatusCode(trimmed);
      if (rowsCode && rowsCode !== trimmed) setRowsCode(null);
    }
  };

  const viewRows = () => {
    if (!trimmed) return;
    if (rowsCode === trimmed) {
      void rowsQuery.refetch();
    } else {
      setRowsCode(trimmed);
      if (statusCode && statusCode !== trimmed) setStatusCode(null);
    }
  };

  // Every loaded page, in order. A row the batch moved while it was still
  // processing can turn up on two pages — kept once, by id.
  /**
   * Back to an empty card: no code, no status, no rows. The cleared batches'
   * cached answers are dropped too (which also stops a status re-check in
   * flight), so asking about one again starts from a fresh request rather than
   * flashing what was on screen before.
   */
  const clear = () => {
    for (const cleared of new Set([statusCode, rowsCode])) {
      if (cleared) queryClient.removeQueries({ queryKey: consignmentRequestKeys.bulkUpload(cleared) });
    }
    setCode("");
    setStatusCode(null);
    setRowsCode(null);
    errorReport.reset();
    onClear?.();
  };
  const canClear = Boolean(trimmed || statusCode || rowsCode);

  const rows = React.useMemo(() => {
    const seen = new Set<string>();
    const all: Record<string, unknown>[] = [];
    for (const pageResult of rowsQuery.data?.pages ?? []) {
      for (const row of pageResult.rows) {
        const key = row.id != null ? String(row.id) : null;
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        all.push(row);
      }
    }
    return all;
  }, [rowsQuery.data]);
  // The latest page's total — it can still grow while the batch is processing.
  const pages = rowsQuery.data?.pages ?? [];
  const total = Math.max(pages[pages.length - 1]?.meta?.total ?? 0, rows.length);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = rowsQuery;
  const loadMore = React.useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  useLoadMoreOnScroll(scrollRef, sentinelRef, Boolean(hasNextPage) && !isFetchingNextPage, loadMore, rows.length);

  return (
    <Card className="p-6 sm:p-8">
      <FieldGroup
        title="Check an upload"
        description="Enter a batch code to check its status, view each row's result, or download its error report."
        icon={Search}
        className="grid-cols-1 sm:grid-cols-1 lg:grid-cols-1"
      >
        <form onSubmit={checkStatus} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <FieldShell label="Batch code">
              {({ id }) => (
                <Input
                  id={id}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="e.g. BU-2026-000012"
                  className="font-mono"
                />
              )}
            </FieldShell>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="outline" disabled={!trimmed || batchQuery.isFetching}>
              {batchQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : <Activity className="size-4" />}
              Check status
            </Button>
            <Button type="button" variant="outline" onClick={viewRows} disabled={!trimmed || rowsQuery.isFetching}>
              {rowsQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : <Rows3 className="size-4" />}
              View rows
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => errorReport.mutate(trimmed)}
              disabled={!trimmed || errorReport.isPending}
            >
              {errorReport.isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download error report
            </Button>
            <Button type="button" variant="ghost" onClick={clear} disabled={!canClear}>
              <X className="size-4" />
              Clear
            </Button>
          </div>
        </form>

        {statusCode ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                Status · <span className="font-mono font-semibold">{statusCode}</span>
                {inProgress ? (
                  <span className="font-normal text-blue-700"> · still processing, checking again automatically</span>
                ) : null}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void batchQuery.refetch()}
                disabled={batchQuery.isFetching}
              >
                <RefreshCw className={batchQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
                Refresh
              </Button>
            </div>

            {batchQuery.isPending ? (
              <div className="h-20 animate-pulse rounded-xl border border-border bg-secondary/60" />
            ) : batchQuery.isError ? (
              <ErrorNote>{messageOf(batchQuery.error, "Couldn't load this batch's status.")}</ErrorNote>
            ) : batch ? (
              <BatchSummary batch={batch} />
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No status found for this batch.</p>
            )}
          </section>
        ) : null}

        {rowsCode ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                Rows · <span className="font-mono font-semibold">{rowsCode}</span>
                {rows.length > 0 ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · showing {rows.length} of {total}
                  </span>
                ) : null}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void rowsQuery.refetch()}
                disabled={rowsQuery.isFetching}
              >
                <RefreshCw className={rowsQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
                Refresh
              </Button>
            </div>

            {rowsQuery.isPending ? (
              <div className="flex justify-center py-10 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : rowsQuery.isError ? (
              <ErrorNote>{messageOf(rowsQuery.error, "Couldn't load the rows for this batch.")}</ErrorNote>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No rows found for this batch.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <BatchRowsTable rows={rows} scrollRef={scrollRef}>
                  <div ref={sentinelRef} className="flex justify-center py-3 text-xs text-muted-foreground">
                    {isFetchingNextPage ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Loading more rows…
                      </span>
                    ) : hasNextPage ? (
                      <button type="button" onClick={loadMore} className="underline hover:text-foreground">
                        Load more rows
                      </button>
                    ) : (
                      <span>All {rows.length} rows loaded</span>
                    )}
                  </div>
                </BatchRowsTable>
              </div>
            )}
          </section>
        ) : null}
      </FieldGroup>
    </Card>
  );
}
