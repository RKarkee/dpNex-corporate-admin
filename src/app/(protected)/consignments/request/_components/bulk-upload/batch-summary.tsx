"use client";

import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

import type { BulkUploadBatch } from "../../services/bulk-upload.service";
import { formatPlainValue, humanize, statusTone } from "./bulk-upload-format";

/**
 * The batch's own fields from `GET bulk-upload/{batch_code}`, as a label/value
 * grid. Every plain field is shown — status and the counts people look for
 * first, then the rest. Nested objects are skipped.
 */
const PRIORITY = [
  "batch_code",
  "status",
  "file_name",
  "original_name",
  "total_rows",
  "row_count",
  "processed_rows",
  "success_count",
  "succeeded_rows",
  "created_count",
  "failed_count",
  "failed_rows",
  "error_count",
];
const HIDDEN = new Set(["id"]);

export function BatchSummary({ batch }: { batch: BulkUploadBatch }) {
  const keys = Object.keys(batch).filter(
    (key) => !HIDDEN.has(key) && (batch[key] === null || typeof batch[key] !== "object"),
  );
  const ordered = [
    ...PRIORITY.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !PRIORITY.includes(key)),
  ];

  if (ordered.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-border bg-secondary/60 p-4 sm:grid-cols-3 lg:grid-cols-4">
      {ordered.map((key) => {
        const value = batch[key];
        return (
          <div key={key} className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{humanize(key)}</p>
            {key === "status" && typeof value === "string" ? (
              <Badge variant="outline" className={cn("mt-1", statusTone(value))}>
                {humanize(value.toLowerCase())}
              </Badge>
            ) : (
              <p
                className={cn(
                  "break-words text-sm text-foreground",
                  key === "batch_code" && "font-mono font-semibold",
                )}
              >
                {formatPlainValue(value)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
