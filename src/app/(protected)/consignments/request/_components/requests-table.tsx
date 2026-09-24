"use client";

import Link from "next/link";
import { Eye, Package, Pencil, RefreshCw, Trash2 } from "lucide-react";

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
import { optionLabel, useMetaOptions } from "@/shared/hooks/use-meta-options";
import { cn } from "@/shared/lib/utils";

import type { ConsignmentRequestListItem } from "../types";
import { StatusBadge, UrgencyBadge } from "./status-badges";

/**
 * The request list.
 *
 * Nine columns do not fit a phone, and sideways scrolling would push the
 * actions — the thing people came for — off screen. So Customer, From, To,
 * Package and Ship date drop out below their breakpoints and restack under the
 * tracking id, where nothing is lost.
 */

/** Tighter gutters below `sm`, so the visible columns fit a 375px screen. */
const TABLE_DENSITY = "[&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4";

/**
 * The last column, pinned right below `sm`. `bg-inherit` so the row still owns
 * the background and hover reaches the pinned cell.
 */
const STICKY_ACTIONS =
  "sticky right-0 border-l border-border/70 bg-inherit sm:static sm:border-l-0";

const COLUMNS = 7;

/** The customer name, from whichever of three shapes the API used. */
export function customerName(item: ConsignmentRequestListItem): string {
  if (typeof item.customer === "string" && item.customer.trim()) {
    return item.customer.trim();
  }
  if (item.customer && typeof item.customer === "object" && item.customer.name) {
    return item.customer.name;
  }
  return item.customer_name?.trim() || "—";
}

export function place(city?: string | null, country?: string | null): string {
  const parts = [city?.trim(), country?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

/** Whether a row currently has anywhere to move to. */
export function hasNextStatuses(request: ConsignmentRequestListItem): boolean {
  return Array.isArray(request.next_statuses) && request.next_statuses.length > 0;
}

export interface RequestsTableProps {
  requests: ConsignmentRequestListItem[];
  onDelete: (request: ConsignmentRequestListItem) => void;
  /** Opens Update Status for a row — offered only where `next_statuses` is non-empty. */
  onUpdateStatus: (request: ConsignmentRequestListItem) => void;
  canUpdate: boolean;
  canDelete: boolean;
  canUpdateStatus: boolean;
  /** The row whose delete is in flight, if any. */
  deletingId?: number | null;
}

export function RequestsTable({
  requests,
  onDelete,
  onUpdateStatus,
  canUpdate,
  canDelete,
  canUpdateStatus,
  deletingId,
}: RequestsTableProps) {
  // The rows carry codes (`URGENT`); `/meta` carries the words to show for
  // them. One cached query serves every row.
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
            <TableHead className={cn("text-right", STICKY_ACTIONS)}>
              Action
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {requests.length === 0 ? (
            <TableEmpty colSpan={COLUMNS}>
              No requests match your search.
            </TableEmpty>
          ) : null}


          {requests.map((request) => {
            const from = place(
              request.sender?.sender_city,
              request.sender?.sender_country,
            );
            const to = place(
              request.receiver?.receiver_city,
              request.receiver?.receiver_country,
            );

            return (
              <TableRow
                key={request.id}
                // `bg-card` so the pinned action cell has something opaque to
                // inherit — without it the scrolled rows show through.
                className={cn(
                  "bg-card",
                  deletingId === request.id && "opacity-50",
                )}
              >
                <TableCell className="max-w-40 sm:max-w-none">
                  <Link
                    href={`/consignments/request/${request.id}`}
                    className="truncate font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {request.request_tracking_id || `#${request.id}`}
                  </Link>

                  {/* Carries the dropped columns on small screens. */}
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
                <TableCell className="hidden text-muted-foreground xl:table-cell">
                  {from}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {to}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                  {request.ship_date || "—"}
                </TableCell>

                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={request.status} />
                    <UrgencyBadge
                      urgency={
                        optionLabel(urgencyOptions, request.urgency) ||
                        request.urgency
                      }
                    />
                  </div>
                </TableCell>

                <TableCell className={cn("text-right", STICKY_ACTIONS)}>
                  <div className="flex items-center justify-end gap-0.5">
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link
                        href={`/consignments/request/${request.id}`}
                        aria-label={`View ${request.request_tracking_id}`}
                      >
                        <Eye className="size-4" />
                      </Link>
                    </Button>

                    {canUpdate ? (
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link
                          href={`/consignments/request/${request.id}/edit`}
                          aria-label={`Edit ${request.request_tracking_id}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                    ) : null}

                    {/* Only while the workflow allows a transition — an empty or
                        missing next_statuses means there is nowhere to go. */}
                    {canUpdateStatus && hasNextStatuses(request) && request.can_update_status ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onUpdateStatus(request)}
                        aria-label={`Update status of ${request.request_tracking_id}`}
                        className="text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                    ) : null}

                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(request)}
                        disabled={deletingId === request.id}
                        aria-label={`Delete ${request.request_tracking_id}`}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
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
export function RequestsTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border p-4">
        <Skeleton className="h-10 w-full sm:max-w-sm" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex items-center gap-4">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden h-5 w-32 sm:block" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}
