import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type { AppNotification, NotificationFilterValues } from "../types";

/**
 * `/corporate/notifications` — what has happened to this user.
 *
 * Scope is the API's: a corporate caller sees only their own rows, and an id
 * belonging to somebody else answers 404 exactly as a missing one does.
 */

const BASE = "/corporate/notifications";

export const ENDPOINTS = {
  list: BASE,
  unseenCount: `${BASE}/unseen-count`,
  read: (id: string) => `${BASE}/${id}/read`,
  readAll: `${BASE}/read-all`,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface NotificationListParams extends Partial<NotificationFilterValues> {
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

export interface NotificationListResult {
  items: AppNotification[];
  meta?: PageMeta;
}

/** Documented as `data.notifications`, with the neighbouring shapes accepted. */
function readNotifications(raw: unknown): AppNotification[] {
  if (Array.isArray(raw)) return raw as AppNotification[];
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.notifications)) return raw.notifications as AppNotification[];

  const data = raw.data;
  if (Array.isArray(data)) return data as AppNotification[];
  if (isRecord(data)) {
    if (Array.isArray(data.notifications)) {
      return data.notifications as AppNotification[];
    }
    if (Array.isArray(data.data)) return data.data as AppNotification[];
  }

  return [];
}

/** Blank filters are dropped, so an unused control sends nothing at all. */
function filterParams(params: NotificationListParams): Record<string, string> {
  const out: Record<string, string> = {};

  for (const key of ["read", "type", "created_from", "created_to"] as const) {
    const value = params[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }

  return out;
}

/**
 * One page of notifications, newest first.
 *
 * `silent` because both callers — the dropdown and the inbox — render their own
 * failure in place, and a toast per poll would be unusable.
 */
export async function listNotifications({
  page = 1,
  perPage = 15,
  signal,
  ...filters
}: NotificationListParams = {}): Promise<NotificationListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    ENDPOINTS.list,
    undefined,
    {
      params: { page, per_page: perPage, ...filterParams(filters) },
      silent: true,
      signal,
    },
  );

  return { items: readNotifications(response.raw), meta: response.meta };
}

/**
 * `GET /unseen-count` — a single COUNT, meant to be polled for the bell badge.
 *
 * Returns 0 rather than throwing on an unexpected shape: a badge is not worth
 * an error state, and zero is the honest reading of "we could not tell".
 */
export async function fetchUnseenCount(signal?: AbortSignal): Promise<number> {
  const raw = await privateApiClient.get<unknown>(ENDPOINTS.unseenCount, {
    silent: true,
    // A poll must never be the thing that signs someone out.
    skipAuthRedirect: true,
    signal,
  });

  const source = isRecord(raw) && isRecord(raw.data) ? raw.data : raw;
  if (!isRecord(source)) return 0;

  const count = Number(source.unseen_count ?? source.count ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/**
 * `PATCH /{id}/read`.
 *
 * Already-read is a no-op rather than an error, so a double click is harmless.
 * `silent` because the row updates in place — there is nothing a toast would
 * add to a dot disappearing.
 */
export function markNotificationRead(id: string): Promise<MutationResult> {
  return privateApiClient.mutate("PATCH", ENDPOINTS.read(id), undefined, {
    silent: true,
  });
}

/** `POST /read-all` — one update against every unread row, not a per-row loop. */
export function markAllNotificationsRead(): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ENDPOINTS.readAll, undefined, {
    silent: true,
  });
}
