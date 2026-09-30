"use client";

import * as React from "react";

import { useSummaryReport } from "../_hooks/use-summary-report";
import type { SummaryReportParams } from "../types";
import { SummaryBillingCard, SummaryConsignmentsCard } from "./summary-report-domain-cards";
import { SummaryReportBreakdownTable } from "./summary-report-breakdown-table";
import { SummaryReportErrorState } from "./summary-report-error-state";
import { SummaryReportFilters, type SummaryReportFilterValues } from "./summary-report-filters";
import { SummaryReportSettlementCard } from "./summary-report-settlement-card";
import { SummaryReportSkeleton } from "./summary-report-skeleton";
import { SummaryReportStatuses } from "./summary-report-statuses";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthsAgoIso(months: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
    .toISOString()
    .slice(0, 10);
}

function humanizeDimension(value: string | null): string {
  if (!value) return "Category";
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SummaryReportView() {
  const [filters, setFilters] = React.useState<SummaryReportFilterValues>({
    from: monthsAgoIso(3),
    to: todayIso(),
    groupBy: "COUNTRY",
  });

  const params: SummaryReportParams = {
    from_date: filters.from,
    to_date: filters.to,
    group_by: filters.groupBy,
  };
  const query = useSummaryReport(params);

  return (
    <>
      <SummaryReportFilters value={filters} onApply={setFilters} applying={query.isFetching} />

      {query.isLoading ? (
        <SummaryReportSkeleton />
      ) : query.isError && !query.data ? (
        <SummaryReportErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <SummaryConsignmentsCard data={query.data.consignments} />
            <SummaryBillingCard data={query.data.billing} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <SummaryReportSettlementCard settlement={query.data.settlement} />
            <SummaryReportStatuses statuses={query.data.status} />
          </div>

          <SummaryReportBreakdownTable
            dimensionLabel={humanizeDimension(query.data.filters.group_by)}
            rows={query.data.breakdown}
          />
        </div>
      ) : null}
    </>
  );
}
