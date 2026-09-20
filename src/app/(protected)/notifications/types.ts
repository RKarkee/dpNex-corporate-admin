/**
 * Notifications — what happened, how you are told about it, and what is still
 * open.
 *
 * Nothing in this file enumerates notification types or channels. Both come
 * from `GET /meta` (`notification_types`, `notification_channels`) and the API
 * has thirteen types today with more coming; a list hardcoded here would go
 * stale silently and quietly drop rows from a filter. The only vocabulary this
 * app owns is the shape of a record.
 */

export interface AppNotification {
  /** A UUID, not an integer — do not coerce it. */
  id: string;
  /** A `/meta` key, or something newer this build has never heard of. */
  type?: string | null;
  title?: string | null;
  message?: string | null;
  read?: boolean | null;
  read_at?: string | null;
  created_at?: string | null;
  /** `support_ticket`, `consignment`, … — what the row points at. */
  entity_type?: string | null;
  entity_id?: number | string | null;
}

export interface NotificationFilterValues {
  /** `""` all · `"true"` read only · `"false"` unread only. */
  read: string;
  type: string;
  created_from: string;
  created_to: string;
}

/* -------------------------------------------------------------------------- */
/* Preferences and devices                                                    */
/* -------------------------------------------------------------------------- */

export interface NotificationPreference {
  channel: string;
  is_enabled: boolean;
  /**
   * True while no row has been stored for this channel — the value shown is
   * the configured default. There is no endpoint to put it back, so this is
   * reported, never offered as an action.
   */
  is_default?: boolean | null;
}

export interface DeviceToken {
  id: number;
  token: string;
  platform?: string | null;
  last_used_at?: string | null;
  created_at?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Attention summary                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Raw attention-summary payload from the API.
 *
 * The API keeps adding groups, nested metrics and filter metadata, so the UI
 * treats this as a dynamic tree rather than a fixed contract.
 */
export type AttentionSummary = Record<string, unknown>;

/** `"DRIVING_LICENSE"` → `"Driving license"`, `"awaiting_first_reply"` → `"Awaiting first reply"`. */
export function humanize(value: string): string {
  const words = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean);

  const [firstWord, ...restWords] = words;
  if (!firstWord) return "";
  return [firstWord.charAt(0).toUpperCase() + firstWord.slice(1), ...restWords].join(" ");
}

/** Unread is unread, whichever way the row spells it. */
export function isUnread(notification: AppNotification): boolean {
  if (notification.read === true) return false;
  return !notification.read_at;
}
