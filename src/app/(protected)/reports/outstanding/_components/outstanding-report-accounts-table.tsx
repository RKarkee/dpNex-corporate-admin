import { Landmark } from "lucide-react";

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
import type { OutstandingReportGroup } from "../types";

/**
 * The per-account billed/collected/outstanding breakdown — one row per
 * account, one column per series, read straight off `rows` rather than
 * re-deriving values from the parallel `categories`/`series[].data` arrays.
 */
export function OutstandingReportAccountsTable({ accounts }: { accounts: OutstandingReportGroup }) {
  const { dimension, series, rows } = accounts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dimension ? `Outstanding by ${dimension}` : "Outstanding by account"}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 || series.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No outstanding balances for this period"
            description="A per-account breakdown will appear here once bills or payments exist in range."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dimension || "Account"}</TableHead>
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
