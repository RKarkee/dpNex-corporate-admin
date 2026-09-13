"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Pagination } from "@/shared/components/ui/pagination";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import {
  useMarkNotificationRead,
  useNotificationList,
} from "../_hooks/use-notification-inbox";
import {
  buildListQuery,
  DEFAULT_FILTERS,
  hasActiveFilters,
  parseListState,
  type NotificationListState,
} from "../lib/notification-params";
import { notificationHref } from "../lib/notification-routes";
import { isUnread, type AppNotification, type NotificationFilterValues } from "../types";
import { NotificationFilters } from "./notification-filters";
import {
  NotificationsTable,
  NotificationsTableSkeleton,
} from "./notifications-table";

const PER_PAGE = 15;

/**
 * The full notification list.
 *
 * Runs its own filtered, paginated query rather than reading the provider — the
 * provider holds the newest eight for the panel, which is a different question.
 * Both live under the same cache root, so marking one read patches the other.
 *
 * No polling here: the page is on screen and being read, and rows appearing
 * under the cursor while someone works down the list is the opposite of
 * helpful. The bell keeps polling and says when there is something new.
 */
export function InboxView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { filters, page } = parseListState(searchParams);

  const { data, isPending, isError, error, isFetching, refetch } =
    useNotificationList({ page, perPage: PER_PAGE, filters });

  const markRead = useMarkNotificationRead();

  const { notificationTypeOptions } = useMetaOptions();
  const typeLabels = React.useMemo(
    () => new Map(notificationTypeOptions.map((o) => [o.value, o.label])),
    [notificationTypeOptions],
  );

  const commit = (next: NotificationListState) => {
    const query = buildListQuery(next);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // A narrowed result set almost never has the page the user was on.
  const applyFilters = (next: NotificationFilterValues) =>
    commit({ filters: next, page: 1 });

  const handleSelect = (notification: AppNotification) => {
    if (isUnread(notification)) markRead.mutate(notification.id);

    const href = notificationHref(notification);
    if (href) router.push(href);
  };

  const items = data?.items ?? [];

  const bar = (
    <NotificationFilters
      value={filters}
      onChange={applyFilters}
      onReset={() => commit({ filters: DEFAULT_FILTERS, page: 1 })}
      disabled={isPending}
    />
  );

  if (isPending) {
    return (
      <div className="space-y-6">
        {bar}
        <NotificationsTableSkeleton />
      </div>
    );
  }

  if (isError) {
    /*
     * The one failure worth naming.
     *
     * The type list comes from `/meta`, and if the list endpoint validates
     * `type` against a narrower set it answers 422 for a perfectly reasonable
     * choice. Rather than a dead page, the message is shown with the way out —
     * and this disappears on its own the day the two lists agree.
     */
    const validation = isApiError(error) && error.isValidationError;

    return (
      <div className="space-y-6">
        {bar}
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" strokeWidth={2} />
          </span>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            {validation
              ? "That filter was refused"
              : "Could not load notifications"}
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {isApiError(error)
              ? error.message
              : "Something went wrong. Please try again."}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {validation && filters.type ? (
              <Button
                variant="outline"
                onClick={() => applyFilters({ ...filters, type: "" })}
              >
                Clear the type filter
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Only when nothing is filtered. "Nothing yet" would be a lie with fifty rows
  // behind a date range.
  if (items.length === 0 && !hasActiveFilters(filters)) {
    return (
      <div className="space-y-6">
        {bar}
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Updates about your shipments, tickets, pickups and approvals arrive here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bar}

      <Card>
        <CardContent className="p-0">
          <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
            <NotificationsTable
              notifications={items}
              typeLabels={typeLabels}
              onSelect={handleSelect}
              onMarkRead={(notification) => markRead.mutate(notification.id)}
            />
          </div>

          <div className="border-t border-border px-4">
            <Pagination
              meta={data.meta}
              onPageChange={(nextPage) => commit({ filters, page: nextPage })}
              disabled={isFetching}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
