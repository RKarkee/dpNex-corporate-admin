"use client";

import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

import type { BulkUploadBatchListItem } from "../../services/bulk-upload.service";
import { BatchProgress } from "./batch-progress";
import { formatPlainValue, humanize, statusTone } from "./bulk-upload-format";
import { CopyCodeButton } from "./copy-code-button";

const COLUMNS = ["Batch Code", "File Name", "Status", "Progress", "Rows", "Uploaded"];

const count = (value: number | null | undefined) => (value == null ? 0 : Number(value));

/**
 * The uploads, one per row. Read-only: to dig into one, copy its batch code
 * and paste it into "Check an upload" below (status, rows, error report).
 * Every column stays a column at every width — the table scrolls sideways on
 * a phone rather than stacking. No Portal column: a corporate only ever sees
 * its own portal's uploads.
 */
export function BatchesTable({ batches }: { batches: BulkUploadBatchListItem[] }) {
  return (
    <Table className="min-w-[960px]">
      <TableHeader>
        <TableRow>
          {COLUMNS.map((label) => (
            <TableHead key={label} className="whitespace-nowrap">
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => {
          const total = count(batch.total_rows);
          const failed = count(batch.failed_rows);
          const invalid = count(batch.validation_error_rows);
          return (
            <TableRow key={batch.id ?? batch.batch_code} className="align-top">
              <TableCell>
                <div className="flex items-center gap-1">
                  <span className="whitespace-nowrap font-mono text-xs text-foreground">
                    {batch.batch_code}
                  </span>
                  <CopyCodeButton code={batch.batch_code} />
                </div>
              </TableCell>
              <TableCell className="max-w-[240px] whitespace-normal break-words font-medium text-foreground">
                {batch.original_filename || "—"}
              </TableCell>
              <TableCell>
                {batch.status ? (
                  <Badge variant="outline" className={`whitespace-nowrap ${statusTone(batch.status)}`}>
                    {humanize(batch.status.toLowerCase())}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <BatchProgress
                  percent={batch.progress_percent}
                  status={batch.status}
                  hasErrors={batch.has_errors}
                />
                <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
                  {count(batch.processed_rows)} of {total} processed
                </p>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs">
                <p className="text-foreground">
                  <span className="font-semibold">{total}</span> total
                </p>
                <p>
                  <span className="text-emerald-700">{count(batch.succeeded_rows)} succeeded</span>
                  {" · "}
                  <span className={failed > 0 ? "text-destructive" : "text-muted-foreground"}>
                    {failed} failed
                  </span>
                </p>
                {invalid > 0 ? <p className="text-destructive">{invalid} invalid</p> : null}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-foreground">
                <p>{formatPlainValue(batch.created_at)}</p>
                {batch.finished_at ? (
                  <p className="text-muted-foreground">Finished {formatPlainValue(batch.finished_at)}</p>
                ) : !batch.is_finished ? (
                  <p className="text-blue-700">Running…</p>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
