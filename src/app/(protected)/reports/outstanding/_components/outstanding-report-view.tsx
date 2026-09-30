"use client";

import * as React from "react";

import { useOutstandingReport } from "../_hooks/use-outstanding-report";
import type { OutstandingReportParams } from "../types";
import { OutstandingReportAccountsTable } from "./outstanding-report-accounts-table";
import { OutstandingReportErrorState } from "./outstanding-report-error-state";
import { OutstandingReportFilters, type OutstandingReportDateRange } from "./outstanding-report-filters";
import { OutstandingReportSkeleton } from "./outstanding-report-skeleton";
import { OutstandingReportTiles } from "./outstanding-report-tiles";
import { OutstandingReportTotalsCard } from "./outstanding-report-totals-card";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthsAgoIso(months: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
    .toISOString()
    .slice(0, 10);
}

export function OutstandingReportView() {
  const [range, setRange] = React.useState<OutstandingReportDateRange>({
    from: monthsAgoIso(3),
    to: todayIso(),
  });

  const params: OutstandingReportParams = { from_date: range.from, to_date: range.to };
  const query = useOutstandingReport(params);

  return (
    <>
      <OutstandingReportFilters value={range} onApply={setRange} applying={query.isFetching} />

      {query.isLoading ? (
        <OutstandingReportSkeleton />
      ) : query.isError && !query.data ? (
        <OutstandingReportErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <div className="space-y-5">
          <OutstandingReportTiles totals={query.data.totals} />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <OutstandingReportTotalsCard totals={query.data.totals} />
            </div>
            <div className="lg:col-span-2">
              <OutstandingReportAccountsTable accounts={query.data.accounts} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
