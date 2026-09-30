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
import type { SummaryReportBreakdownRow } from "../types";

const COLUMNS: { key: keyof SummaryReportBreakdownRow; label: string; format: string }[] = [
  { key: "consignment_count", label: "Consignments", format: "integer" },
  { key: "box_count", label: "Boxes", format: "integer" },
  { key: "total_weight", label: "Weight", format: "weight" },
  { key: "declared_value", label: "Declared value", format: "currency" },
  { key: "invoice_count", label: "Bills", format: "integer" },
  { key: "billed_amount", label: "Billed", format: "currency" },
  { key: "collected_amount", label: "Collected", format: "currency" },
  { key: "outstanding_amount", label: "Outstanding", format: "currency" },
];

/**
 * `breakdown` came back as a flat array with confirmed, fixed fields — one
 * row per category of whatever `group_by` requested, carrying both
 * consignment and billing figures — so the columns are hard-coded rather
 * than derived generically, unlike the Billing report's own (unconfirmed,
 * always-empty) `breakdown` array.
 */
export function SummaryReportBreakdownTable({
  dimensionLabel,
  rows,
}: {
  dimensionLabel: string;
  rows: SummaryReportBreakdownRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{`Breakdown by ${dimensionLabel}`}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No breakdown for this period"
            description="A breakdown table will appear here once the report has data to group."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dimensionLabel}</TableHead>
                {COLUMNS.map((column) => (
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
                  {COLUMNS.map((column) => (
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
