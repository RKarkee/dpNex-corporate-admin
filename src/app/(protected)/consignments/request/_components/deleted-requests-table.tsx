"use client";

import { Package, RotateCcw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { optionLabel, useMetaOptions } from "@/shared/hooks/use-meta-options";
import { cn } from "@/shared/lib/utils";

import type { ConsignmentRequestListItem } from "../types";
import { customerName, place } from "./requests-table";
import { StatusBadge, UrgencyBadge } from "./status-badges";

/**
 * The Deleted tab's table — the main list's columns, with Restore as the only
 * action. The tracking id is plain text, not a link: a deleted request has no
 * detail page to open.
 */

const TABLE_DENSITY = "[&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4";
const STICKY_ACTIONS =
  "sticky right-0 border-l border-border/70 bg-inherit sm:static sm:border-l-0";
const COLUMNS = 7;

export function DeletedRequestsTable({
  requests,
  onRestore,
  restoringId,
}: {
  requests: ConsignmentRequestListItem[];
  onRestore: (request: ConsignmentRequestListItem) => void;
  /** The row whose restore is in flight, if any. */
  restoringId?: number | null;
}) {
  const { urgencyOptions } = useMetaOptions();

  return (
    <div className="overflow-hidden">
      <Table className={TABLE_DENSITY}>
        <TableHeader>
          <TableRow className="bg-card hover:bg-transparent">
            <TableHead>Tracking ID</TableHead>
            <TableHead className="hidden lg:table-cell">Customer</TableHead>
            <TableHead className="hidden xl:table-cell">From</TableHead>
            <TableHead className="hidden md:table-cell">To</TableHead>
            <TableHead className="hidden sm:table-cell">Ship date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className={cn("text-right", STICKY_ACTIONS)}>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {requests.length === 0 ? (
            <TableEmpty colSpan={COLUMNS}>No deleted requests.</TableEmpty>
          ) : null}

          {requests.map((request) => {
            const from = place(request.sender?.sender_city, request.sender?.sender_country);
            const to = place(request.receiver?.receiver_city, request.receiver?.receiver_country);

            return (
              <TableRow
                key={request.id}
                className={cn("bg-card", restoringId === request.id && "opacity-50")}
              >
                <TableCell className="max-w-40 sm:max-w-none">
                  <span className="block truncate font-medium text-foreground">
                    {request.request_tracking_id || `#${request.id}`}
                  </span>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Package aria-hidden className="size-3 shrink-0" />
                    {request.package_type} · {request.no_of_boxes} box
                    {request.no_of_boxes === 1 ? "" : "es"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground md:hidden">
                    {from} → {to}
                  </p>
                </TableCell>

                <TableCell className="hidden max-w-40 truncate text-muted-foreground lg:table-cell">
                  {customerName(request)}
                </TableCell>
                <TableCell className="hidden text-muted-foreground xl:table-cell">{from}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{to}</TableCell>
                <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                  {request.ship_date || "—"}
                </TableCell>

                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={request.status} />
                    <UrgencyBadge
                      urgency={optionLabel(urgencyOptions, request.urgency) || request.urgency}
                    />
                  </div>
                </TableCell>

                <TableCell className={cn("text-right", STICKY_ACTIONS)}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRestore(request)}
                    disabled={restoringId === request.id}
                    aria-label={`Restore ${request.request_tracking_id}`}
                    className="text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
