"use client";

import Link from "next/link";
import { Eye, Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";

import { formatDate, summarizePayload } from "../lib/approval-format";
import { isCancellable, type ApprovalRequest } from "../types";
import { ApprovalStatusBadge, ApprovalTypeBadge } from "./approval-badges";

/**
 * The request list.
 *
 * Six columns do not fit a phone, and sideways scrolling would push the
 * actions — the thing people came for — off screen. So Type, "Asking for" and
 * Requested drop out below their breakpoints and restack under the request
 * number, where nothing is lost.
 */

/** Tighter gutters below `sm`, so the visible columns fit a 375px screen. */
const TABLE_DENSITY = "[&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4";

/**
 * The last column, pinned right below `sm`. `bg-inherit` so the row still owns
 * the background and hover reaches the pinned cell.
 */
const STICKY_ACTIONS =
  "sticky right-0 border-l border-border/70 bg-inherit sm:static sm:border-l-0";

const COLUMNS = 6;

export interface ApprovalsTableProps {
  requests: ApprovalRequest[];
  onCancel: (request: ApprovalRequest) => void;
  /** Per type — approvals are granted per request type, not per action. */
  canCancel: (type: string) => boolean;
  /** The row whose withdrawal is in flight, if any. */
  cancellingId?: number | string | null;
}

export function ApprovalsTable({
  requests,
  onCancel,
  canCancel,
  cancellingId,
}: ApprovalsTableProps) {
  return (
    <div className="overflow-hidden">
      <Table className={TABLE_DENSITY}>
        <TableHeader>
          <TableRow className="bg-card hover:bg-transparent">
            <TableHead>Request</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden sm:table-cell">Asking for</TableHead>
            <TableHead className="hidden lg:table-cell">Requested</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className={cn("text-right", STICKY_ACTIONS)}>
              Action
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {requests.length === 0 ? (
            <TableEmpty colSpan={COLUMNS}>
              No requests match these filters.
            </TableEmpty>
          ) : null}

          {requests.map((request) => {
            const summary = summarizePayload(request);
            const pending = cancellingId === request.id;

            return (
              <TableRow
                key={request.id}
                // `bg-card` so the pinned action cell has something opaque to
                // inherit — without it the scrolled rows show through.
                className={cn("bg-card", pending && "opacity-50")}
              >
                <TableCell className="max-w-44 sm:max-w-none">
                  <Link
                    href={`/approval-requests/${request.id}`}
                    className="truncate font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {request.request_no || `#${request.id}`}
                  </Link>

                  {/* Carries the dropped columns on small screens. */}
                  <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
                    {request.type_label?.trim() || String(request.type)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground sm:hidden">
                    {summary}
                  </p>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  <ApprovalTypeBadge request={request} />
                </TableCell>

                <TableCell className="hidden max-w-56 truncate text-muted-foreground sm:table-cell">
                  {summary}
                </TableCell>

                <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                  {formatDate(request.requested_at ?? request.created_at)}
                </TableCell>

                <TableCell>
                  <ApprovalStatusBadge request={request} />
                </TableCell>

                <TableCell className={cn("text-right", STICKY_ACTIONS)}>
                  <div className="flex items-center justify-end gap-0.5">
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link
                        href={`/approval-requests/${request.id}`}
                        aria-label={`View ${request.request_no}`}
                      >
                        <Eye className="size-4" />
                      </Link>
                    </Button>

                    {/* Only a pending request can be withdrawn — everything
                        else has already been decided, and the API refuses —
                        and only by someone who may raise that type at all. */}
                    {isCancellable(request) && canCancel(String(request.type)) ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onCancel(request)}
                        disabled={pending}
                        aria-label={`Withdraw ${request.request_no}`}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Undo2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** The same column rhythm with the cells blanked, so the page does not jump. */
export function ApprovalsTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex items-center gap-4">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden h-5 w-40 sm:block" />
            <Skeleton className="hidden h-5 w-28 lg:block" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}
