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

import type { ConsignmentListItem } from "../types";
import { customerName, place, trackingId } from "./consignments-table";
import { StatusBadge, UrgencyBadge } from "./status-badges";

/**
 * The Deleted tab's table — the main list's columns, with Restore as the only
 * action. The tracking id is plain text, not a link: a deleted consignment has
 * no detail page to open.
 */

const TABLE_DENSITY = "[&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4";
const STICKY_ACTIONS =
  "sticky right-0 border-l border-border/70 bg-inherit sm:static sm:border-l-0";
const COLUMNS = 7;

export function DeletedConsignmentsTable({
  consignments,
  onRestore,
  restoringId,
}: {
  consignments: ConsignmentListItem[];
  onRestore: (consignment: ConsignmentListItem) => void;
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
          {consignments.length === 0 ? (
            <TableEmpty colSpan={COLUMNS}>No deleted consignments.</TableEmpty>
          ) : null}

          {consignments.map((consignment) => {
            const from = place(consignment.sender?.sender_city, consignment.sender?.sender_country);
            const to = place(
              consignment.receiver?.receiver_city,
              consignment.receiver?.receiver_country,
            );
            const boxes = consignment.no_of_boxes ?? 0;

            return (
              <TableRow
                key={consignment.id}
                className={cn("bg-card", restoringId === consignment.id && "opacity-50")}
              >
                <TableCell className="max-w-40 sm:max-w-none">
                  <span className="block truncate font-medium text-foreground">
                    {trackingId(consignment)}
                  </span>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Package aria-hidden className="size-3 shrink-0" />
                    {consignment.package_type || "—"}
                    {boxes > 0 ? ` · ${boxes} box${boxes === 1 ? "" : "es"}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground md:hidden">
                    {from} → {to}
                  </p>
                </TableCell>

                <TableCell className="hidden max-w-40 truncate text-muted-foreground lg:table-cell">
                  {customerName(consignment)}
                </TableCell>
                <TableCell className="hidden text-muted-foreground xl:table-cell">{from}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{to}</TableCell>
                <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                  {consignment.ship_date || "—"}
                </TableCell>

                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={consignment.status} />
                    <UrgencyBadge
                      urgency={optionLabel(urgencyOptions, consignment.urgency) || consignment.urgency}
                    />
                  </div>
                </TableCell>

                <TableCell className={cn("text-right", STICKY_ACTIONS)}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRestore(consignment)}
                    disabled={restoringId === consignment.id}
                    aria-label={`Restore ${trackingId(consignment)}`}
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
