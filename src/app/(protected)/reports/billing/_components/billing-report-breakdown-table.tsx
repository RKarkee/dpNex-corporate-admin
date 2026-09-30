import * as React from "react";
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

import { formatUnknownCell } from "../_lib/format-tile";
import type { BillingReportBreakdownRow } from "../types";

/**
 * The report's `breakdown` came back as a plain array with no per-column
 * format metadata (unlike the consignment/customer/request reports' group
 * shape), and it has been empty in every response seen — no `group_by` has
 * been exercised yet. This derives its columns from the union of keys
 * across whatever rows do come back, leading with `label`/`key` if present,
 * rather than assuming a fixed shape; when empty it shows a quiet
 * placeholder instead of a bare table.
 */
export function BillingReportBreakdownTable({ rows }: { rows: BillingReportBreakdownRow[] }) {
  const columns = React.useMemo(() => {
    const keys = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
    const ordered = Array.from(keys);
    const leading = ["label", "key"].filter((key) => ordered.includes(key));
    const rest = ordered.filter((key) => !leading.includes(key));
    return [...leading, ...rest];
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No breakdown for this period"
            description="A breakdown table will appear here once the report is grouped by a dimension."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className={column === "label" || column === "key" ? undefined : "text-right"}>
                    {column.replace(/[_-]+/g, " ")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={String(row.key ?? row.label ?? index)}>
                  {columns.map((column) => (
                    <TableCell
                      key={column}
                      className={
                        column === "label" || column === "key"
                          ? "font-medium text-foreground"
                          : "text-right tabular-nums"
                      }
                    >
                      {formatUnknownCell(row[column])}
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
