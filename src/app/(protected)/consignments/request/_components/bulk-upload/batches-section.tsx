"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Inbox, Loader2, RefreshCw } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Pagination } from "@/shared/components/ui/pagination";

import { useBulkUploadBatches } from "../../_hooks/use-bulk-upload";
import {
  EMPTY_BULK_UPLOAD_FILTERS,
  parseBulkUploadListState,
  writeBulkUploadListState,
  type BulkUploadFilterValues,
  type BulkUploadListState,
} from "../../_lib/bulk-upload-params";
import { BatchesFilterBar } from "./batches-filter-bar";
import { BatchesTable } from "./batches-table";

/**
 * Every upload, filterable and paginated — `GET bulk-upload`. Read-only: a
 * batch is looked into by copying its code into "Check an upload" below.
 *
 * Filters, page and page size live in the URL (`bu_*` keys, see
 * `_lib/bulk-upload-params.ts`); nothing here mirrors them in state, so the
 * query key is always exactly what is on screen. `replace` + `scroll: false`
 * keeps paging from piling up history entries or jumping the viewport.
 */
export function BatchesSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { filters, page, perPage } = parseBulkUploadListState(searchParams);

  const listQuery = useBulkUploadBatches({ page, perPage, ...filters });

  const commit = (next: BulkUploadListState) => {
    const query = writeBulkUploadListState(new URLSearchParams(searchParams.toString()), next);
    const qs = query.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // A narrowed result set almost never has the page the user was on.
  const applyFilters = (next: BulkUploadFilterValues) => commit({ filters: next, page: 1, perPage });
  const resetFilters = () => commit({ filters: EMPTY_BULK_UPLOAD_FILTERS, page: 1, perPage });

  const batches = listQuery.data?.batches ?? [];
  const running = batches.some((batch) => !batch.is_finished);

  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Uploads</h2>
          <p className="text-sm text-muted-foreground">
            Every spreadsheet uploaded, newest first.
            {running ? <span className="text-blue-700"> Some are still running — refreshing automatically.</span> : null}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void listQuery.refetch()}
          disabled={listQuery.isFetching}
        >
          <RefreshCw className={listQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        <BatchesFilterBar
          value={filters}
          onApply={applyFilters}
          onReset={resetFilters}
          perPage={perPage}
          onPerPageChange={(next) => commit({ filters, page: 1, perPage: next })}
        />

        {listQuery.isPending ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : listQuery.isError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{isApiError(listQuery.error) ? listQuery.error.message : "Couldn't load the uploads."}</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Inbox className="size-8 opacity-40" />
            <p>No uploads match these filters.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className={listQuery.isFetching ? "opacity-70 transition-opacity" : undefined}>
              <BatchesTable batches={batches} />
            </div>
            <div className="border-t border-border px-4">
              <Pagination
                meta={listQuery.data?.meta}
                onPageChange={(next) => commit({ filters, page: next, perPage })}
                disabled={listQuery.isFetching}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
