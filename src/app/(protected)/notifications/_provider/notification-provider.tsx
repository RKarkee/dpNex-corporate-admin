"use client";

import * as React from "react";

import { useOptionalSession } from "@/shared/auth/session-context";

import {
  useAttentionSummary,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationList,
  useUnseenCount,
} from "../_hooks/use-notification-inbox";
import { attentionRows, attentionTotal, type AttentionRow } from "../lib/notification-display";
import { DEFAULT_FILTERS } from "../lib/notification-params";
import type { AppNotification } from "../types";

/**
 * NOTIFICATION STATE — one owner for the whole app.
 *
 * The bell badge, the dropdown, the attention menu and the inbox page all have
 * to agree about what is unread. The way they disagree is by each fetching for
 * itself: three components mounting three copies of the same query, three poll
 * timers, and a mark-read in one that the other two never hear about.
 *
 * So the shared queries are started HERE, once, and everything else reads this
 * context. The inbox page still runs its own filtered, paginated list — but
 * under the same cache root, so an optimistic mark-read patches its rows too.
 *
 * This provider must sit INSIDE the authenticated tree: it must not fetch at
 * all before there is a session.
 */

/** Panel params, module-level so the query key is stable across renders. */
const RECENT_PARAMS = {
  page: 1,
  perPage: 8,
  filters: DEFAULT_FILTERS,
} as const;

/**
 * Polling cadence.
 *
 * Sixty seconds against the endpoint built for it — `unseen-count` is a single
 * COUNT — with background polling off, so a tab left open in another window
 * costs nothing until it is looked at again. When websockets arrive this
 * becomes the safety net and drops to five minutes; nothing else here changes.
 */
const POLL_MS = 60 * 1000;

interface NotificationContextValue {
  /** Newest rows, for the header panel. */
  recent: AppNotification[];
  isLoadingRecent: boolean;
  hasError: boolean;

  unseenCount: number;

  attention: AttentionRow[];
  attentionCount: number;

  markRead: (id: string) => void;
  markAllRead: () => void;
  isMarkingAll: boolean;
  refresh: () => void;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(
  null,
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useOptionalSession();
  const enabled = Boolean(user);

  const recentQuery = useNotificationList(RECENT_PARAMS, {
    pollMs: POLL_MS,
    enabled,
  });
  const countQuery = useUnseenCount({ pollMs: POLL_MS, enabled });
  const attentionQuery = useAttentionSummary({ pollMs: POLL_MS, enabled });

  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();

  const summary = attentionQuery.data;

  const value = React.useMemo<NotificationContextValue>(
    () => ({
      recent: recentQuery.data?.items ?? [],
      isLoadingRecent: recentQuery.isPending,
      // The panel shows a retry rather than an empty list, which would read as
      // "nothing has happened" when the truth is "we could not ask".
      hasError: recentQuery.isError || countQuery.isError,

      unseenCount: countQuery.data ?? 0,

      attention: attentionRows(summary),
      attentionCount: attentionTotal(summary),

      markRead: (id: string) => markReadMutation.mutate(id),
      markAllRead: () => markAllMutation.mutate(),
      isMarkingAll: markAllMutation.isPending,
      refresh: () => {
        void recentQuery.refetch();
        void countQuery.refetch();
        void attentionQuery.refetch();
      },
    }),
    [
      recentQuery,
      countQuery,
      attentionQuery,
      summary,
      markReadMutation,
      markAllMutation,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Reads the shared notification state.
 *
 * Throws outside the provider rather than returning empty state: a bell that
 * silently shows zero because it was mounted in the wrong place is a bug that
 * survives review.
 */
export function useNotifications(): NotificationContextValue {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used inside <NotificationProvider>");
  }
  return context;
}
