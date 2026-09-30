import type { LucideIcon } from "lucide-react";

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
import type { RequestReportGroup } from "../types";

/**
 * Renders a `RequestReportGroup` (`statuses` or `by_customer` — identical
 * shape) as a table: one row per category, one column per series, read
 * straight off `rows` rather than re-deriving values from the parallel
 * `categories`/`series[].data` arrays.
 */
export function RequestReportGroupTable({
  title,
  icon,
  emptyDescription,
  group,
}: {
  title: string;
  icon: LucideIcon;
  emptyDescription: string;
  group: RequestReportGroup;
}) {
  const { dimension, series, rows } = group;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 || series.length === 0 ? (
          <EmptyState icon={icon} title="No data for this period" description={emptyDescription} />
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
