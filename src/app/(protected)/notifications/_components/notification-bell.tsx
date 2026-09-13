"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";
import { cn } from "@/shared/lib/utils";

import { useNotifications } from "../_provider/notification-provider";
import { badgeText } from "../lib/notification-display";
import { notificationHref } from "../lib/notification-routes";
import { isUnread, type AppNotification } from "../types";
import { NotificationItem } from "./notification-item";

/**
 * The bell: what has HAPPENED.
 *
 * Deliberately not the same question as the attention menu beside it, which
 * says what is still OPEN. One badge cannot mean both without meaning nothing.
 *
 * Everything here reads the shared provider — no queries of its own — so the
 * badge, the panel and the inbox page can never disagree about what is unread.
 */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const {
    recent,
    isLoadingRecent,
    hasError,
    unseenCount,
    markRead,
    markAllRead,
    isMarkingAll,
    refresh,
  } = useNotifications();

  /** `/meta`'s wording, for the tooltip on each row's type badge. */
  const { notificationTypeOptions } = useMetaOptions();
  const typeLabels = React.useMemo(
    () => new Map(notificationTypeOptions.map((o) => [o.value, o.label])),
    [notificationTypeOptions],
  );

  /**
   * Opening a row marks it read and follows it where it leads.
   *
   * Both, not either: a notification you have opened is read whether or not
   * this portal had a screen to send you to.
   */
  const handleSelect = (notification: AppNotification) => {
    if (isUnread(notification)) markRead(notification.id);

    const href = notificationHref(notification);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  };

  const badge = badgeText(unseenCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          /* 36px below sm. The header already carries a menu button, the logo,
             the other control and the avatar; at 40 each these two push the
             row past 375px. Still above the 24px minimum touch target. */
          className="relative size-9 sm:size-10"
          aria-label={
            unseenCount > 0
              ? `Notifications, ${unseenCount} unread`
              : "Notifications"
          }
        >
          <Bell className="size-5" />
          {badge ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
              {badge}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>

          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            onClick={refresh}
            aria-label="Refresh notifications"
          >
            <RefreshCw className="size-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={markAllRead}
            disabled={isMarkingAll || unseenCount === 0}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        </div>

        {/* Bounded: the panel is a glance at the newest few, not a list to
            work through — that is what the inbox below is for. */}
        <div className="max-h-[60vh] divide-y divide-border overflow-y-auto overscroll-contain">
          {isLoadingRecent ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, row) => (
                <div key={row} className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : hasError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Could not load notifications.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={refresh}>
                Try again
              </Button>
            </div>
          ) : recent.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing yet. Updates about your shipments, tickets and requests
              arrive here.
            </p>
          ) : (
            recent.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                typeLabel={typeLabels.get(String(notification.type ?? ""))}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>

        <div className={cn("border-t border-border")}>
          <Button
            variant="ghost"
            className="w-full rounded-none"
            onClick={() => {
              setOpen(false);
              router.push("/notifications");
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
