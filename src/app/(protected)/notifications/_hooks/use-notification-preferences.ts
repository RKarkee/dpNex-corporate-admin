"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/shared/components/toast";

import {
  listNotificationPreferences,
  readUpdatedPreferences,
  updateNotificationPreferences,
  type PreferenceUpdate,
} from "../services/notification-preference.service";
import type { NotificationPreference } from "../types";
import { notificationKeys } from "./query-keys";

/**
 * Channel preferences.
 *
 * Enums change on deploy, not during a session, and so do these: fetched once
 * and left alone until something writes.
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: ({ signal }) => listNotificationPreferences(signal),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Flips one channel.
 *
 * Optimistic, because a switch that waits for a round trip before moving feels
 * broken — and the `PUT` answers with the full, updated list, which is seeded
 * straight into the cache so there is no refetch and no window where the switch
 * and the server disagree.
 *
 * Only the changed channel is sent: anything omitted keeps its current value,
 * so an untouched channel stays at its default rather than becoming a stored
 * row that happens to match it.
 */
export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (update: PreferenceUpdate) =>
      updateNotificationPreferences([update]),

    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.preferences() });

      const previous = queryClient.getQueryData<NotificationPreference[]>(
        notificationKeys.preferences(),
      );

      queryClient.setQueryData<NotificationPreference[]>(
        notificationKeys.preferences(),
        (current) =>
          current?.map((row) =>
            row.channel === update.channel
              ? // Touching a channel stores a row for it, so it is no longer
                // reporting the configured default.
                { ...row, is_enabled: update.is_enabled, is_default: false }
              : row,
          ),
      );

      return { previous };
    },

    onError: (error, _update, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.preferences(), context.previous);
      }
      toast.error(error);
    },

    onSuccess: (result) => {
      const updated = readUpdatedPreferences(result);
      if (updated.length > 0) {
        queryClient.setQueryData(notificationKeys.preferences(), updated);
      }
    },
  });
}
