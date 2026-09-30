"use client";

import * as React from "react";

import { useConsignmentReport } from "../_hooks/use-consignment-report";
import type { ConsignmentReportParams } from "../types";
import { ReportErrorState } from "./report-error-state";
import { ReportFilters, type ReportFilterValues } from "./report-filters";
import { ReportBreakdownTable } from "./report-breakdown-table";
import { ReportSkeleton } from "./report-skeleton";
import { ReportStatuses } from "./report-statuses";
import { ReportTiles } from "./report-tiles";
import { ReportTotalsCard } from "./report-totals-card";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthsAgoIso(months: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
    .toISOString()
    .slice(0, 10);
}

export function ReportView() {
  const [filters, setFilters] = React.useState<ReportFilterValues>({
    from: monthsAgoIso(3),
    to: todayIso(),
    groupBy: "VIA",
  });

  const params: ConsignmentReportParams = {
    from_date: filters.from,
    to_date: filters.to,
    group_by: filters.groupBy,
  };
  const query = useConsignmentReport(params);

  return (
    <>
      <ReportFilters value={filters} onApply={setFilters} applying={query.isFetching} />

      {query.isLoading ? (
        <ReportSkeleton />
      ) : query.isError && !query.data ? (
        <ReportErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <div className="space-y-5">
          <ReportTiles tiles={query.data.tiles} />

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <ReportTotalsCard totals={query.data.totals} />
            </div>
            <div className="lg:col-span-2">
              <ReportBreakdownTable breakdown={query.data.breakdown} />
            </div>
          </div>

          <ReportStatuses statuses={query.data.statuses} />
        </div>
      ) : null}
    </>
  );
}
