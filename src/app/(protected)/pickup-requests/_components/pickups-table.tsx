"use client";

import Link from "next/link";
import { Boxes, Eye, Truck } from "lucide-react";

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

import { formatTime, vehicleLabel, type PickupRequest } from "../types";
import { PickupStatusBadge } from "./pickup-badges";

/**
 * The pickup list.
 *
 * Six columns do not fit a phone, so Vehicle, Requests and Load drop out below
 * their breakpoints and restack under the pickup number, where nothing is lost.
 * Scheduled stays at every width: a pickup is a promise about a time, and the
 * time is what people scan this table for.
 */

/** Tighter gutters below `sm`, so the visible columns fit a 375px screen. */
const TABLE_DENSITY = "[&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4";

const STICKY_ACTIONS =
  "sticky right-0 border-l border-border/70 bg-inherit sm:static sm:border-l-0";

/** Seven, counting the pinned action column. */
const COLUMNS = 7;

/** `0` is a real answer here — a van booked before anything is packed. */
function load(pickup: PickupRequest): string {
  const boxes = Number(pickup.total_boxes ?? 0);
  const weight = Number(pickup.total_weight ?? 0);

  const parts: string[] = [];
  parts.push(`${boxes} box${boxes === 1 ? "" : "es"}`);
  if (Number.isFinite(weight) && weight > 0) parts.push(`${weight} kg`);

  return parts.join(" · ");
}

function scheduled(pickup: PickupRequest): string {
  const date = formatDate(pickup.pickup_date);
  const time = formatTime(pickup.pickup_time);
  return time ? `${date}, ${time}` : date;
}

export interface PickupsTableProps {
  pickups: PickupRequest[];
}

export function PickupsTable({ pickups }: PickupsTableProps) {
  return (
    <div className="overflow-hidden">
      <Table className={TABLE_DENSITY}>
        <TableHeader>
          <TableRow className="bg-card hover:bg-transparent">
            <TableHead>Pickup</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead className="hidden md:table-cell">Vehicle</TableHead>
            <TableHead className="hidden lg:table-cell">Requests</TableHead>
            <TableHead className="hidden sm:table-cell">Load</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className={cn("text-right", STICKY_ACTIONS)}>
              Action
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pickups.length === 0 ? (
            <TableEmpty colSpan={COLUMNS}>No pickups to show.</TableEmpty>
          ) : null}

          {pickups.map((pickup) => {
            const count = pickup.consignment_request_count ?? 0;

            return (
              <TableRow key={pickup.id} className="bg-card">
                <TableCell className="max-w-44 sm:max-w-none">
                  <Link
                    href={`/pickup-requests/${pickup.id}`}
                    className="truncate font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {pickup.pickup_no || `#${pickup.id}`}
                  </Link>

                  {/* Carries the dropped columns on small screens. */}
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground md:hidden">
                    <Truck aria-hidden className="size-3 shrink-0" />
                    {vehicleLabel(pickup.vehicle_type)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground sm:hidden">
                    {count} request{count === 1 ? "" : "s"} · {load(pickup)}
                  </p>
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  {scheduled(pickup)}
                  <span className="mt-0.5 block sm:hidden">
                    <PickupStatusBadge pickup={pickup} />
                  </span>
                </TableCell>

                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {vehicleLabel(pickup.vehicle_type)}
                </TableCell>

                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  <span className="inline-flex items-center gap-1.5">
                    <Boxes aria-hidden className="size-3.5" />
                    {count}
                  </span>
                </TableCell>

                <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                  {load(pickup)}
                </TableCell>

                <TableCell className="hidden sm:table-cell">
                  <PickupStatusBadge pickup={pickup} />
                </TableCell>

                <TableCell className={cn("text-right", STICKY_ACTIONS)}>
                  <Button variant="ghost" size="icon-sm" asChild>
                    <Link
                      href={`/pickup-requests/${pickup.id}`}
                      aria-label={`View ${pickup.pickup_no}`}
                    >
                      <Eye className="size-4" />
                    </Link>
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

/** The same column rhythm with the cells blanked, so the page does not jump. */
export function PickupsTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex items-center gap-4">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="hidden h-5 w-24 md:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-10" />
          </div>
        ))}
      </div>
    </Card>
  );
}
