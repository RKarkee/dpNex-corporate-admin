"use client";

import type * as React from "react";

import { Badge } from "@/shared/components/ui/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";

import { formatAnyValue, humanize, statusTone } from "./bulk-upload-format";

/**
 * The rows of one upload batch. Columns are built from the keys the rows
 * actually carry: row number, status and error fields first (the ones people
 * scan for), then everything else in order.
 */
const PRIORITY = ["row_number", "row_no", "row", "line", "status", "message", "error", "errors"];
const ERROR_KEYS = new Set(["error", "errors", "message"]);
/** Internal ids mean nothing to the user. */
const HIDDEN = new Set(["id"]);

interface BatchRowsTableProps {
  rows: Record<string, unknown>[];
  /**
   * The table scrolls inside its own box (both ways, header pinned) — this ref
   * is that box, so the caller can watch for the bottom being reached. The
   * shared `<Table>` isn't used because its own horizontal-scroll wrapper
   * would become the scroll box and unpin the header.
   */
  scrollRef?: React.Ref<HTMLDivElement>;
  /** Rendered inside the scroll box, under the table — e.g. a load-more sentinel. */
  children?: React.ReactNode;
}

export function BatchRowsTable({ rows, scrollRef, children }: BatchRowsTableProps) {
  const keys: string[] = [];
  for (const row of rows.slice(0, 50)) {
    for (const key of Object.keys(row)) if (!keys.includes(key) && !HIDDEN.has(key)) keys.push(key);
  }
  const columns = [
    ...PRIORITY.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !PRIORITY.includes(key)),
  ];

  return (
    <div ref={scrollRef} className="max-h-[28rem] overflow-auto">
      <table className="w-full min-w-[720px] caption-bottom text-sm">
      <TableHeader>
        <TableRow>
          {columns.map((key) => (
            <TableHead
              key={key}
              className="sticky top-0 z-10 whitespace-nowrap bg-card shadow-[inset_0_-1px_0] shadow-border"
            >
              {humanize(key)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={String(row.id ?? index)} className="align-top">
            {columns.map((key) => {
              const value = row[key];
              if (key === "status" && typeof value === "string") {
                return (
                  <TableCell key={key} className="whitespace-nowrap">
                    <Badge variant="outline" className={statusTone(value)}>
                      {humanize(value.toLowerCase())}
                    </Badge>
                  </TableCell>
                );
              }
              const text = formatAnyValue(value);
              return (
                <TableCell
                  key={key}
                  className={cn(
                    "max-w-[360px] whitespace-normal break-words",
                    text === "—"
                      ? "text-muted-foreground"
                      : ERROR_KEYS.has(key)
                        ? "text-destructive"
                        : "text-foreground",
                  )}
                >
                  {text}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
      </table>
      {children}
    </div>
  );
}
