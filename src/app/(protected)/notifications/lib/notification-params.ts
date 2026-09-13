import type { NotificationFilterValues } from "../types";

/**
 * Filters and page, as they live in the URL.
 *
 * Same contract as the ticket and approval lists: the query string is the
 * single source of truth, so a refresh, a bookmark and the Back button all
 * restore the same view.
 *
 * The type value is NOT validated against a list here. `/meta` publishes
 * thirteen types and more are coming; checking against a copy in this file
 * would silently drop a filter the API understands perfectly well. An
 * unsupported value is the server's to refuse, and the view renders that
 * refusal with a way out.
 */

export const DEFAULT_FILTERS: NotificationFilterValues = {
  read: "",
  type: "",
  created_from: "",
  created_to: "",
};

const ALL_KEYS = ["read", "type", "created_from", "created_to"] as const;

export interface NotificationListState {
  filters: NotificationFilterValues;
  page: number;
}

function readBool(value: string | null): string {
  const trimmed = (value ?? "").trim().toLowerCase();
  return trimmed === "true" || trimmed === "false" ? trimmed : "";
}

function readDate(value: string | null): string {
  return (value ?? "").trim().slice(0, 10);
}

export function parseListState(
  searchParams: URLSearchParams | { get(key: string): string | null },
): NotificationListState {
  const get = (key: string) => searchParams.get(key);
  const page = Number.parseInt(get("page") ?? "1", 10);

  return {
    filters: {
      read: readBool(get("read")),
      type: (get("type") ?? "").trim().toUpperCase(),
      created_from: readDate(get("created_from")),
      created_to: readDate(get("created_to")),
    },
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function buildListQuery({
  filters,
  page,
}: NotificationListState): string {
  const params = new URLSearchParams();

  for (const key of ALL_KEYS) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }

  if (page > 1) params.set("page", String(page));

  return params.toString();
}

export function countActiveFilters(filters: NotificationFilterValues): number {
  return ALL_KEYS.reduce(
    (count, key) => (filters[key].trim() ? count + 1 : count),
    0,
  );
}

export function hasActiveFilters(filters: NotificationFilterValues): boolean {
  return countActiveFilters(filters) > 0;
}
