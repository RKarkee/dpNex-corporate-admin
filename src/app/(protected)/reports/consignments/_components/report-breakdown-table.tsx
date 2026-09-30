import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

import { formatTileValue } from "../_lib/format-tile";
import type { ConsignmentReportBreakdown } from "../types";

/**
 * The report's `breakdown` — one row per category of the chosen `group_by`
 * dimension, one column per series. `breakdown.rows` already carries each
 * series value keyed by the series' own `key`, so the table reads straight
 * off `rows` rather than re-deriving values from the parallel
 * `categories`/`series[].data` arrays.
 */
export function ReportBreakdownTable({ breakdown }: { breakdown: ConsignmentReportBreakdown }) {
  const { dimension, series, rows } = breakdown;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dimension ? `Breakdown by ${dimension}` : "Breakdown"}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 || series.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No breakdown for this period"
            description="A breakdown table will appear here once the report has data to group."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dimension || "Category"}</TableHead>
                {series.map((column) => (
                  <TableHead key={column.key} className="text-right">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium text-foreground">{row.label}</TableCell>
                  {series.map((column) => (
                    <TableCell key={column.key} className="text-right tabular-nums">
                      {formatTileValue(row[column.key] as number | string | null | undefined, column.format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
