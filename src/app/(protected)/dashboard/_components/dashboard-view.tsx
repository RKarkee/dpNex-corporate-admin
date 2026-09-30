"use client";

import * as React from "react";

import { useDashboardReport } from "../_hooks/use-dashboard-report";
import type { DashboardReportParams } from "../types";
import { DashboardDateRange, DashboardFilters } from "./dashboard-filters";
import { DashboardErrorState } from "./dashboard-error-state";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DashboardStatuses } from "./dashboard-statuses";
import { DashboardTimeseriesChart } from "./dashboard-timeseries-chart";
import { DashboardTiles } from "./dashboard-tiles";
import {
  BillingSummaryCard,
  CollectionsSummaryCard,
  ConsignmentsSummaryCard,
  RequestsSummaryCard,
} from "./summary-cards";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export function DashboardView() {
  const [range, setRange] = React.useState<DashboardDateRange>({
    from: firstOfMonthIso(),
    to: todayIso(),
  });

  const params: DashboardReportParams = { from_date: range.from, to_date: range.to };
  const query = useDashboardReport(params);

  return (
    <>
      <DashboardFilters
        from={range.from}
        to={range.to}
        onApply={setRange}
        applying={query.isFetching}
      />

      {query.isLoading ? (
        <DashboardSkeleton />
      ) : query.isError && !query.data ? (
        <DashboardErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <div className="space-y-5">
          <DashboardTiles tiles={query.data.tiles} />

          <div className="grid gap-5 lg:grid-cols-2">
            <ConsignmentsSummaryCard data={query.data.consignments} />
            <BillingSummaryCard data={query.data.billing} />
            <RequestsSummaryCard data={query.data.requests} />
            <CollectionsSummaryCard data={query.data.collections} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <DashboardStatuses statuses={query.data.statuses} />
            <DashboardTimeseriesChart points={query.data.timeseries} />
          </div>
        </div>
      ) : null}
    </>
  );
}
