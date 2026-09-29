"use client";

import { Download, Eye, History, Loader2 } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatDateTime } from "@/shared/lib/dates";

import { humanizeStatus } from "../../../../_components/status-badges";
import { useLabelFile, useLabelHistory } from "../../../../_hooks/use-labels";
import { formatFileSize } from "../../../../_lib/download-file";
import type { ConsignmentRequestDetail, LabelHistoryItem } from "../../../../types";

const HEADERS = ["Version", "Status", "File", "Provider", "Generated", "Actions"];

/** Generated → green; a recorded failure → red; anything else is still in flight. */
function statusVariant(label: LabelHistoryItem) {
  if (label.generated) return "success" as const;
  if (label.failure_reason || /FAIL|ERROR/i.test(label.status)) return "destructive" as const;
  return "warning" as const;
}

/**
 * Label History — directly under the Labels card on the Overview tab.
 *
 * Every version newest first, each with View (new tab) and Download. Only a generated version has a file, so
 * the buttons are disabled on the rest and the failure reason shows instead.
 * Generating, regenerating and the current version live in `LabelOptionsSection`.
 */
export function LabelHistorySection({ request }: { request: ConsignmentRequestDetail }) {
  const history = useLabelHistory(request.id);
  const file = useLabelFile(request.request_tracking_id);

  const labels = [...(history.data ?? [])].sort((a, b) => b.version - a.version);

  return (
    <Card className="p-6">
      <div className="mb-4 border-b border-border/70 pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <History className="size-4 text-primary" aria-hidden />
          Label history{history.data ? ` (${labels.length})` : ""}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every version produced for this request, newest first.
        </p>
      </div>

      {history.isPending ? (
        <div className="space-y-2">
          {[0, 1].map((row) => (
            <Skeleton key={row} className="h-10 w-full" />
          ))}
        </div>
      ) : history.isError ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p className="text-destructive">Could not load the label history.</p>
          <Button size="sm" variant="outline" onClick={() => void history.refetch()}>
            Retry
          </Button>
        </div>
      ) : labels.length === 0 ? (
        <p className="text-sm text-muted-foreground">No label versions yet.</p>
      ) : (
        <div className="-mx-6 overflow-x-auto px-6">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                {HEADERS.map((header) => (
                  <TableHead key={header} className="whitespace-nowrap">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {labels.map((label) => {
                const hasFile = label.generated;
                const busy = file.busyId === label.id;
                return (
                  <TableRow key={label.id}>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-medium">v{label.version}</span>
                      {label.is_current ? <Badge className="ml-2">Current</Badge> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(label)}>{humanizeStatus(label.status)}</Badge>
                      {label.failure_reason ? (
                        <p className="mt-1 max-w-56 text-xs text-destructive">
                          {label.failure_reason}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="break-all font-medium">{label.file_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(label.file_size)}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{label.provider || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(label.generated_at ?? label.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          disabled={!hasFile || busy}
                          onClick={() => file.view(label)}
                          aria-label={`View label v${label.version}`}
                          title="View"
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : (
                            <Eye className="size-4" aria-hidden />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-primary"
                          disabled={!hasFile || busy}
                          onClick={() => file.download(label)}
                          aria-label={`Download label v${label.version}`}
                          title="Download"
                        >
                          <Download className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
