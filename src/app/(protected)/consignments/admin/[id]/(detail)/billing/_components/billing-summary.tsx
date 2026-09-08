"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

import { StatCard, type StatTone } from "@/app/(protected)/_components/stat-card";
import { useConsignmentBillingSummary } from "../_hooks/use-consignment-billing-summary";
import { formatInvoiceAmount } from "../_lib/format-invoice";
import {
  summaryBreakdowns,
  summaryCurrency,
  summaryStats,
} from "../_lib/summarize-billing";

/** Cycled across the stat cards so a wide summary stays readable. */
const TONES: StatTone[] = ["navy", "crimson", "orange"];

/**
 * Headline billing figures above this consignment's invoice table — context
 * for the list below, not a destination of its own. Mirrors
 * `billing-accounts/_components/billing-summary.tsx`, including its
 * quiet-failure behaviour: the table below shows its own error and empty
 * states, so a second error card here would be noise.
 */
export function BillingSummary({ consignmentId }: { consignmentId: number | string }) {
  const { data, isPending, isError } = useConsignmentBillingSummary(consignmentId);

  if (isError) return null;

  if (isPending) return <BillingSummarySkeleton />;

  const stats = summaryStats(data);
  const breakdowns = summaryBreakdowns(data);
  const currency = summaryCurrency(data);

  if (stats.length === 0 && breakdowns.length === 0) return null;

  return (
    <div className="space-y-5">
      {stats.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.key}
              label={stat.label}
              value={stat.isMoney ? formatInvoiceAmount(stat.value, currency) : stat.value}
              hint={currency && stat.isMoney ? `In ${currency}` : ""}
              tone={TONES[index % TONES.length]}
            />
          ))}
        </div>
      ) : null}

      {breakdowns.map((breakdown) => {
        const hasCounts = breakdown.rows.some((row) => row.count !== null);
        const hasAmounts = breakdown.rows.some((row) => row.amount !== null);

        return (
          <Card key={breakdown.key}>
            <CardContent className="p-0">
              <div className="border-b border-border p-4">
                <h3 className="text-base font-semibold text-foreground">{breakdown.label}</h3>
              </div>
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-card hover:bg-transparent">
                      <TableHead>Status</TableHead>
                      {hasCounts ? <TableHead className="text-right">Count</TableHead> : null}
                      {hasAmounts ? <TableHead className="text-right">Amount</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdown.rows.map((row) => (
                      <TableRow key={row.label} className="bg-card">
                        <TableCell className="font-medium text-foreground">{row.label}</TableCell>
                        {hasCounts ? (
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {row.count ?? "—"}
                          </TableCell>
                        ) : null}
                        {hasAmounts ? (
                          <TableCell className="text-right font-medium tabular-nums text-foreground">
                            {row.amount === null ? "—" : formatInvoiceAmount(row.amount, currency)}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function BillingSummarySkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-9 w-20" />
          <Skeleton className="mt-3 h-4 w-16" />
        </Card>
      ))}
    </div>
  );
}
