"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/shared/components/toast";

import {
  fetchUnseenCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationListResult,
} from "../services/notification.service";
import { fetchAttentionSummary } from "../services/attention-summary.service";
import { DEFAULT_FILTERS } from "../lib/notification-params";
import type { NotificationFilterValues } from "../types";
import { notificationKeys } from "./query-keys";

/**
 * The queries behind the bell, the inbox and the attention menu — and the two
 * writes that have to keep all of them in step.
 *
 * Polling is passed in rather than fixed here: the provider owns the cadence
 * for the shared queries, and the inbox page (which is on screen and being
 * read) does not poll at all.
 */

export interface PollOptions {
  /** `false` disables polling entirely. */
  pollMs?: number | false;
  enabled?: boolean;
}

export function useNotificationList(
  params: {
    page: number;
    perPage: number;
    filters: NotificationFilterValues;
  },
  { pollMs = false, enabled = true }: PollOptions = {},
) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: ({ signal }) =>
      listNotifications({
        page: params.page,
        perPage: params.perPage,
        ...params.filters,
        signal,
      }),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: pollMs,
    // A background tab should cost nothing; the poll resumes on focus.
    refetchIntervalInBackground: false,
  });
}

export function useUnseenCount({ pollMs = false, enabled = true }: PollOptions = {}) {
  return useQuery({
    queryKey: notificationKeys.unseenCount(),
    queryFn: ({ signal }) => fetchUnseenCount(signal),
    enabled,
    refetchInterval: pollMs,
    refetchIntervalInBackground: false,
  });
}

export function useAttentionSummary({
  pollMs = false,
  enabled = true,
}: PollOptions = {}) {
  return useQuery({
    queryKey: notificationKeys.attention(),
    queryFn: ({ signal }) => fetchAttentionSummary(signal),
    enabled,
    refetchInterval: pollMs,
    refetchIntervalInBackground: false,
  });
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Marks one row read, everywhere it is cached.
 *
 * The same notification is usually on screen twice — once in the dropdown and
 * once in the inbox behind it — so the patch is applied across every query
 * under the `list` prefix rather than to the one that happened to trigger it.
 * The badge is decremented in the same tick, because a dot disappearing while
 * the count stays put reads as a bug.
 *
 * Optimistic: this has to feel instantaneous, and the server's own answer
 * arrives moments later through the invalidation.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousLists = queryClient.getQueriesData<NotificationListResult>({
        queryKey: notificationKeys.lists(),
      });
      const previousCount = queryClient.getQueryData<number>(
        notificationKeys.unseenCount(),
      );

      let wasUnread = false;

      queryClient.setQueriesData<NotificationListResult>(
        { queryKey: notificationKeys.lists() },
        (current) => {
          if (!current) return current;

          return {
            ...current,
            items: current.items.map((item) => {
              if (item.id !== id) return item;
              if (item.read !== true) wasUnread = true;
              return { ...item, read: true, read_at: new Date().toISOString() };
            }),
          };
        },
      );

      if (wasUnread && typeof previousCount === "number") {
        queryClient.setQueryData(
          notificationKeys.unseenCount(),
          Math.max(0, previousCount - 1),
        );
      }

      return { previousLists, previousCount };
    },

    onError: (_error, _id, context) => {
      // Put every patched list back exactly as it was — a half-rolled-back
      // cache is worse than the original failure.
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(notificationKeys.unseenCount(), context.previousCount);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/** Clears the lot. One request, not a loop over rows. */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousLists = queryClient.getQueriesData<NotificationListResult>({
        queryKey: notificationKeys.lists(),
      });
      const previousCount = queryClient.getQueryData<number>(
        notificationKeys.unseenCount(),
      );

      const now = new Date().toISOString();

      queryClient.setQueriesData<NotificationListResult>(
        { queryKey: notificationKeys.lists() },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.read === true ? item : { ...item, read: true, read_at: now },
                ),
              }
            : current,
      );

      queryClient.setQueryData(notificationKeys.unseenCount(), 0);

      return { previousLists, previousCount };
    },

    onError: (error, _variables, context) => {
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(notificationKeys.unseenCount(), context.previousCount);
      }
      toast.error(error);
    },

    onSuccess: (result) => {
      toast.success(result.message?.trim() || "All notifications marked read");
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/** The inbox's own starting point, so both callers agree on "no filters". */
export const EMPTY_FILTERS = DEFAULT_FILTERS;
