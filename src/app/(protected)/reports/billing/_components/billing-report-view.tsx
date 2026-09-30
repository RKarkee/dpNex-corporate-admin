"use client";

import * as React from "react";

import { useBillingReport } from "../_hooks/use-billing-report";
import { useExportBillingReport } from "../_hooks/use-export-billing-report";
import type { BillingReportParams } from "../types";
import { BillingReportAdjustmentsCard } from "./billing-report-adjustments-card";
import { BillingReportBreakdownTable } from "./billing-report-breakdown-table";
import { BillingReportCollectionsCard } from "./billing-report-collections-card";
import { BillingReportErrorState } from "./billing-report-error-state";
import { BillingReportFilters, type BillingReportDateRange } from "./billing-report-filters";
import { BillingReportSkeleton } from "./billing-report-skeleton";
import { BillingReportTiles } from "./billing-report-tiles";
import { BillingReportTotalsCard } from "./billing-report-totals-card";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthsAgoIso(months: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
    .toISOString()
    .slice(0, 10);
}

export function BillingReportView() {
  const [range, setRange] = React.useState<BillingReportDateRange>({
    from: monthsAgoIso(3),
    to: todayIso(),
  });

  const params: BillingReportParams = { from_date: range.from, to_date: range.to };
  const query = useBillingReport(params);
  const exportReport = useExportBillingReport();

  return (
    <>
      <BillingReportFilters
        value={range}
        onApply={setRange}
        applying={query.isFetching}
        onDownload={() => exportReport.mutate(params)}
        downloading={exportReport.isPending}
      />

      {query.isLoading ? (
        <BillingReportSkeleton />
      ) : query.isError && !query.data ? (
        <BillingReportErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <div className="space-y-5">
          <BillingReportTiles tiles={query.data.tiles} />

          <div className="grid gap-5 lg:grid-cols-3">
            <BillingReportTotalsCard totals={query.data.totals} />
            <BillingReportCollectionsCard collections={query.data.collections} />
            <BillingReportAdjustmentsCard adjustments={query.data.adjustments} />
          </div>

          <BillingReportBreakdownTable rows={query.data.breakdown} />
        </div>
      ) : null}
    </>
  );
}
