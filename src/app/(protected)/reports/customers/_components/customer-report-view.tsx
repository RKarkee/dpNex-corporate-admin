"use client";

import * as React from "react";
import { BarChart3, Users } from "lucide-react";

import { useCustomerReport } from "../_hooks/use-customer-report";
import type { CustomerReportParams } from "../types";
import { CustomerConversionsCard } from "./customer-conversions-card";
import { CustomerReportErrorState } from "./customer-report-error-state";
import { CustomerReportFilters, type CustomerReportDateRange } from "./customer-report-filters";
import { CustomerReportGroupTable } from "./customer-report-group-table";
import { CustomerReportSkeleton } from "./customer-report-skeleton";
import { CustomerReportTiles } from "./customer-report-tiles";
import { CustomerReportTotalsCard } from "./customer-report-totals-card";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthsAgoIso(months: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
    .toISOString()
    .slice(0, 10);
}

export function CustomerReportView() {
  const [range, setRange] = React.useState<CustomerReportDateRange>({
    from: monthsAgoIso(3),
    to: todayIso(),
  });

  const params: CustomerReportParams = { from_date: range.from, to_date: range.to };
  const query = useCustomerReport(params);

  return (
    <>
      <CustomerReportFilters value={range} onApply={setRange} applying={query.isFetching} />

      {query.isLoading ? (
        <CustomerReportSkeleton />
      ) : query.isError && !query.data ? (
        <CustomerReportErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <div className="space-y-5">
          <CustomerReportTiles tiles={query.data.tiles} />

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <CustomerReportTotalsCard totals={query.data.totals} />
            </div>
            <div className="lg:col-span-2">
              <CustomerReportGroupTable
                title={query.data.breakdown.dimension ? `Breakdown by ${query.data.breakdown.dimension}` : "Breakdown"}
                icon={BarChart3}
                emptyDescription="A breakdown table will appear here once the report has data to group."
                group={query.data.breakdown}
              />
            </div>
          </div>

          <CustomerReportGroupTable
            title="Customer activity"
            icon={Users}
            emptyDescription="Per-customer consignment and billing activity will appear here once available."
            group={query.data.activity}
          />

          <CustomerConversionsCard conversions={query.data.conversions} />
        </div>
      ) : null}
    </>
  );
}
