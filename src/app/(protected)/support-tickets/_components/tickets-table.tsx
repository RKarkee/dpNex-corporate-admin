"use client";

import Link from "next/link";
import { CheckCircle2, Eye, Package, UserRound } from "lucide-react";

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
import { formatDate } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/utils";

import { isClosable, type SupportTicket } from "../types";
import {
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "./ticket-badges";

/**
 * The ticket list.
 *
 * Seven columns do not fit a phone, and sideways scrolling would push the
 * actions — the thing people came for — off screen. So Category, Priority,
 * Owner and Opened drop out below their breakpoints and restack under the
 * subject, where nothing is lost.
 */

/** Tighter gutters below `sm`, so the visible columns fit a 375px screen. */
const TABLE_DENSITY = "[&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4";

const STICKY_ACTIONS =
  "sticky right-0 border-l border-border/70 bg-inherit sm:static sm:border-l-0";

const COLUMNS = 7;

/**
 * Who owns this ticket.
 *
 * The list currently returns `assigned_to_name: null` even when `assigned_to`
 * is set, so the name is used when it arrives and "Assigned" stands in when it
 * does not — resolving fifteen ids to names per page would be fifteen extra
 * requests for a column nobody sorts by. The detail page does resolve it.
 */
function owner(ticket: SupportTicket): { label: string; muted: boolean } {
  const name = ticket.assigned_to_name?.trim();
  if (name) return { label: name, muted: false };
  if (ticket.assigned_to) return { label: "Assigned", muted: true };
  return { label: "Unassigned", muted: true };
}

export interface TicketsTableProps {
  tickets: SupportTicket[];
  onClose: (ticket: SupportTicket) => void;
  /** The row whose close is in flight, if any. */
  closingId?: number | string | null;
}

export function TicketsTable({
  tickets,
  onClose,
  closingId,
}: TicketsTableProps) {
  return (
    <div className="overflow-hidden">
      <Table className={TABLE_DENSITY}>
        <TableHeader>
          <TableRow className="bg-card hover:bg-transparent">
            <TableHead>Ticket</TableHead>
            <TableHead className="hidden lg:table-cell">Category</TableHead>
            <TableHead className="hidden sm:table-cell">Priority</TableHead>
            <TableHead className="hidden xl:table-cell">Owner</TableHead>
            <TableHead className="hidden md:table-cell">Opened</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className={cn("text-right", STICKY_ACTIONS)}>
              Action
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {tickets.length === 0 ? (
            <TableEmpty colSpan={COLUMNS}>
              No tickets match these filters.
            </TableEmpty>
          ) : null}

          {tickets.map((ticket) => {
            const assignee = owner(ticket);
            const pending = closingId === ticket.id;

            return (
              <TableRow
                key={ticket.id}
                className={cn("bg-card", pending && "opacity-50")}
              >
                <TableCell className="max-w-48 sm:max-w-none">
                  <Link
                    href={`/support-tickets/${ticket.id}`}
                    className="truncate font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {ticket.subject || ticket.ticket_no}
                  </Link>

                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {ticket.ticket_no}
                    {/* The shipment is the single most useful piece of context
                        a ticket carries, so it rides along at every width. */}
                    {ticket.tracking_no ? ` · ${ticket.tracking_no}` : ""}
                  </p>

                  {/* Carries the dropped columns on small screens. */}
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground xl:hidden">
                    <UserRound aria-hidden className="size-3 shrink-0" />
                    {assignee.label}
                  </p>
                </TableCell>

                <TableCell className="hidden lg:table-cell">
                  <TicketCategoryBadge category={ticket.category} />
                </TableCell>

                <TableCell className="hidden sm:table-cell">
                  <TicketPriorityBadge priority={ticket.priority} />
                </TableCell>

                <TableCell
                  className={cn(
                    "hidden max-w-40 truncate xl:table-cell",
                    assignee.muted ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {assignee.label}
                </TableCell>

                <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                  {formatDate(ticket.created_at)}
                </TableCell>

                <TableCell>
                  <TicketStatusBadge ticket={ticket} />
                </TableCell>

                <TableCell className={cn("text-right", STICKY_ACTIONS)}>
                  <div className="flex items-center justify-end gap-0.5">
                    {ticket.consignment_id ? (
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link
                          href={`/consignments/request/${ticket.consignment_id}`}
                          aria-label={`Open the shipment for ${ticket.ticket_no}`}
                        >
                          <Package className="size-4" />
                        </Link>
                      </Button>
                    ) : null}

                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link
                        href={`/support-tickets/${ticket.id}`}
                        aria-label={`View ${ticket.ticket_no}`}
                      >
                        <Eye className="size-4" />
                      </Link>
                    </Button>

                    {/*
                      Offered on anything not already closed; the server decides
                      whether it is allowed and says why if not. Hidden on a
                      closed ticket rather than disabled — there, it is not a
                      rule waiting to be met, it is simply done.
                    */}
                    {isClosable(ticket) ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onClose(ticket)}
                        disabled={pending}
                        aria-label={`Close ${ticket.ticket_no}`}
                        title="Close this ticket"
                        className="text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <CheckCircle2 className="size-4" />
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
export function TicketsTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex items-center gap-4">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
            <Skeleton className="hidden h-5 w-28 xl:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}
