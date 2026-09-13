import type { NotificationFilterValues } from "../types";

/**
 * Every cache key in this feature, in one place.
 *
 *   ["notifications"]                      → the whole feature
 *   ["notifications", "list", { … }]       → the dropdown's page AND the inbox's
 *   ["notifications", "unseen-count"]      → the bell badge
 *
 * The dropdown and the inbox deliberately share the `list` prefix: a mark-read
 * in one has to patch the other, and `setQueriesData` over that prefix is what
 * makes that one line instead of a subscription.
 */
export const notificationKeys = {
  all: ["notifications"] as const,

  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params: {
    page: number;
    perPage: number;
    filters: NotificationFilterValues;
  }) => [...notificationKeys.lists(), params] as const,

  unseenCount: () => [...notificationKeys.all, "unseen-count"] as const,

  /** Its own root: it is not a notification, and must not be cleared with them. */
  attention: () => ["attention-summary"] as const,

  preferences: () => ["notification-preferences"] as const,
  devices: () => ["device-tokens"] as const,
} as const;
