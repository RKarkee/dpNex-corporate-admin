"use client";

import { ChevronRight } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { useMounted } from "@/shared/hooks/use-mounted";
import { cn } from "@/shared/lib/utils";

import { relativeAge, typeBadgeLabel } from "../lib/notification-display";
import { entityLabel, isRoutable } from "../lib/notification-routes";
import { isUnread, type AppNotification } from "../types";

/**
 * One notification, in the header panel.
 *
 * Unread is carried by weight and a dot rather than a background wash: a panel
 * where most rows are unread would otherwise be a solid block of colour with
 * nothing standing out.
 *
 * The whole row is the target when it leads somewhere, and inert when it does
 * not — a row that looks clickable and does nothing is worse than one that
 * plainly does not.
 */
export function NotificationItem({
  notification,
  typeLabel,
  onSelect,
}: {
  notification: AppNotification;
  /** `/meta`'s wording for this type, when it publishes one. */
  typeLabel?: string;
  onSelect: (notification: AppNotification) => void;
}) {
  /* "13h ago" depends on the current time, so it renders only after mount —
     otherwise the server and the browser disagree and React discards it. */
  const mounted = useMounted();
  const age = mounted ? relativeAge(notification.created_at) : "";

  const unread = isUnread(notification);
  const routable = isRoutable(notification);
  const entity = entityLabel(notification);
  const badge = typeBadgeLabel(notification.type);

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        "flex w-full gap-3 border-l-2 px-4 py-3 text-left transition-colors",
        unread
          ? "border-l-primary bg-primary/[0.03]"
          : "border-l-transparent",
        "hover:bg-secondary/60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          unread ? "bg-primary" : "bg-transparent",
        )}
      />

      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 text-sm",
              unread ? "font-semibold text-foreground" : "text-foreground",
            )}
          >
            {notification.title?.trim() || "Notification"}
          </span>
          {age ? (
            <span className="shrink-0 text-xs text-muted-foreground">{age}</span>
          ) : null}
        </span>

        {/* Two lines, then an ellipsis: a paragraph-long message would otherwise
            make one row taller than the whole panel. The full text is on the
            inbox row it links to. */}
        {notification.message?.trim() ? (
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
            {notification.message}
          </span>
        ) : null}

        <span className="mt-1.5 flex items-center gap-2">
          {badge ? (
            // The short, humanised key — `/meta`'s own label ("Operational
            // alert to affected shipments…") is a sentence, and goes in the
            // tooltip instead.
            <Badge variant="secondary" title={typeLabel || badge}>
              {badge}
            </Badge>
          ) : null}
          {entity ? (
            <span className="truncate text-xs text-muted-foreground">{entity}</span>
          ) : null}
          {routable ? (
            <ChevronRight
              aria-hidden
              className="ml-auto size-4 shrink-0 text-muted-foreground"
            />
          ) : null}
        </span>
      </span>
    </button>
  );
}
