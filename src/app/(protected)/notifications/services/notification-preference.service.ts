import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";

import type { NotificationPreference } from "../types";

/**
 * `/corporate/notification-preferences` — which channels may be used to reach
 * this user.
 *
 * One row per channel, always: a channel with no stored row is reported at its
 * configured default with `is_default: true` rather than being left out. The
 * channel list itself comes from `/meta`, not from here.
 */

const BASE = "/corporate/notification-preferences";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPreferences(raw: unknown): NotificationPreference[] {
  if (Array.isArray(raw)) return raw as NotificationPreference[];
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.notificationpreferences)) {
    return raw.notificationpreferences as NotificationPreference[];
  }

  const data = raw.data;
  if (Array.isArray(data)) return data as NotificationPreference[];
  if (isRecord(data)) {
    if (Array.isArray(data.notificationpreferences)) {
      return data.notificationpreferences as NotificationPreference[];
    }
    if (Array.isArray(data.data)) return data.data as NotificationPreference[];
  }

  return [];
}

export async function listNotificationPreferences(
  signal?: AbortSignal,
): Promise<NotificationPreference[]> {
  const raw = await privateApiClient.get<unknown>(BASE, { silent: true, signal });
  return readPreferences(raw);
}

export interface PreferenceUpdate {
  channel: string;
  is_enabled: boolean;
}

/**
 * `PUT` — only the channels sent are changed; anything omitted keeps its value.
 *
 * So a toggle sends exactly one channel. Sending the whole set would turn every
 * unrelated default into a stored row, and `is_default` would stop meaning
 * anything the moment someone touched a single switch.
 *
 * The response carries the full, updated list, which the caller seeds straight
 * into the cache — no refetch, and no window where the switch and the server
 * disagree.
 */
export function updateNotificationPreferences(
  preferences: PreferenceUpdate[],
): Promise<MutationResult<unknown>> {
  return privateApiClient.mutate("PUT", BASE, { preferences }, { silent: true });
}

/** The updated rows out of a `PUT` response. */
export function readUpdatedPreferences(
  result: MutationResult<unknown>,
): NotificationPreference[] {
  return readPreferences(result.data);
}
