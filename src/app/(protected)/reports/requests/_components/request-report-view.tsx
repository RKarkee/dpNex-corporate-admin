"use client";

import * as React from "react";
import { LayoutGrid, Users } from "lucide-react";

import { useRequestReport } from "../_hooks/use-request-report";
import type { RequestReportParams } from "../types";
import { RequestReportErrorState } from "./request-report-error-state";
import { RequestReportFilters, type RequestReportDateRange } from "./request-report-filters";
import { RequestReportGroupTable } from "./request-report-group-table";
import { RequestReportSkeleton } from "./request-report-skeleton";
import { RequestReportTiles } from "./request-report-tiles";
import { RequestReportTotalsCard } from "./request-report-totals-card";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthsAgoIso(months: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
    .toISOString()
    .slice(0, 10);
}

export function RequestReportView() {
  const [range, setRange] = React.useState<RequestReportDateRange>({
    from: monthsAgoIso(3),
    to: todayIso(),
  });

  const params: RequestReportParams = { from_date: range.from, to_date: range.to };
  const query = useRequestReport(params);

  return (
    <>
      <RequestReportFilters value={range} onApply={setRange} applying={query.isFetching} />

      {query.isLoading ? (
        <RequestReportSkeleton />
      ) : query.isError && !query.data ? (
        <RequestReportErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <div className="space-y-5">
          <RequestReportTiles tiles={query.data.tiles} />

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <RequestReportTotalsCard totals={query.data.totals} />
            </div>
            <div className="lg:col-span-2">
              <RequestReportGroupTable
                title={query.data.statuses.dimension ? `Requests by ${query.data.statuses.dimension}` : "Requests by status"}
                icon={LayoutGrid}
                emptyDescription="A status breakdown will appear here once the report has data to group."
                group={query.data.statuses}
              />
            </div>
          </div>

          <RequestReportGroupTable
            title={query.data.by_customer.dimension ? `Requests by ${query.data.by_customer.dimension}` : "Requests by customer"}
            icon={Users}
            emptyDescription="Per-customer request volumes will appear here once available."
            group={query.data.by_customer}
          />
        </div>
      ) : null}
    </>
  );
}
