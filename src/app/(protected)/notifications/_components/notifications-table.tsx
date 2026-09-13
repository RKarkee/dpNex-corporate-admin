"use client";

import { Check } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
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
import { useMounted } from "@/shared/hooks/use-mounted";
import { formatDateTime } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/utils";

import { relativeAge, typeBadgeLabel } from "../lib/notification-display";
import { entityLabel, isRoutable } from "../lib/notification-routes";
import { isUnread, type AppNotification } from "../types";

/**
 * The inbox.
 *
 * Unread is weight plus a rail, not a coloured background: on a page where most
 * rows are unread, a wash would be the page rather than the signal.
 *
 * Type and Received drop out below their breakpoints and restack under the
 * message, where nothing is lost.
 */

const TABLE_DENSITY = "[&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4";
const COLUMNS = 4;

export interface NotificationsTableProps {
  notifications: AppNotification[];
  /** `/meta`'s wording per type key, for the tooltip. */
  typeLabels: Map<string, string>;
  onSelect: (notification: AppNotification) => void;
  onMarkRead: (notification: AppNotification) => void;
}

export function NotificationsTable({
  notifications,
  typeLabels,
  onSelect,
  onMarkRead,
}: NotificationsTableProps) {
  const mounted = useMounted();

  return (
    <div className="overflow-hidden">
      <Table className={TABLE_DENSITY}>
        <TableHeader>
          <TableRow className="bg-card hover:bg-transparent">
            <TableHead>Notification</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden sm:table-cell">Received</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {notifications.length === 0 ? (
            <TableEmpty colSpan={COLUMNS}>
              No notifications match these filters.
            </TableEmpty>
          ) : null}

          {notifications.map((notification) => {
            const unread = isUnread(notification);
            const routable = isRoutable(notification);
            const entity = entityLabel(notification);
            const badge = typeBadgeLabel(notification.type);
            const age = mounted ? relativeAge(notification.created_at) : "";

            return (
              <TableRow
                key={notification.id}
                className={cn(
                  "bg-card",
                  unread && "border-l-2 border-l-primary",
                )}
              >
                {/* `max-w-md` is wider than a phone, so it is capped to the
                    column below sm — otherwise the message pushes the table
                    into a horizontal scroll it does not need. */}
                <TableCell className="max-w-[15rem] sm:max-w-md">
                  <button
                    type="button"
                    onClick={() => onSelect(notification)}
                    className={cn(
                      "block w-full text-left",
                      routable && "hover:text-primary hover:underline",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-sm",
                        unread
                          ? "font-semibold text-foreground"
                          : "text-foreground",
                      )}
                    >
                      {notification.title?.trim() || "Notification"}
                    </span>
                    {notification.message?.trim() ? (
                      <span className="mt-0.5 line-clamp-3 block text-sm text-muted-foreground">
                        {notification.message}
                      </span>
                    ) : null}
                  </button>

                  {/* Carries the dropped columns on small screens. */}
                  <span className="mt-1 flex flex-wrap items-center gap-2 md:hidden">
                    {badge ? (
                      <Badge variant="secondary">{badge}</Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {age || formatDateTime(notification.created_at)}
                    </span>
                  </span>

                  {entity ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {entity}
                    </span>
                  ) : null}
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {badge ? (
                    <Badge
                      variant="secondary"
                      title={typeLabels.get(String(notification.type ?? "")) || badge}
                    >
                      {badge}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                  {formatDateTime(notification.created_at)}
                </TableCell>

                <TableCell className="text-right">
                  {/* Only unread rows have anything to do here — "mark read" on
                      a read row is a button that does nothing. */}
                  {unread ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onMarkRead(notification)}
                      aria-label="Mark as read"
                      title="Mark as read"
                    >
                      <Check className="size-4" />
                    </Button>
                  ) : null}
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
export function NotificationsTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-4 p-4">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="hidden h-6 w-28 rounded-full md:block" />
            <Skeleton className="hidden h-4 w-32 sm:block" />
          </div>
        ))}
      </div>
    </Card>
  );
}
