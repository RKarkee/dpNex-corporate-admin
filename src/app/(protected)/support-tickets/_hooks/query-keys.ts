import type { TicketFilterValues } from "../types";

/**
 * Every cache key in this feature, in one place.
 *
 *   ["support-tickets"]                        → the whole feature
 *   ["support-tickets", "list", { page, … }]   → one page of the table
 *   ["support-tickets", id]                    → everything about one ticket
 *   ["support-tickets", id, "detail"]          → the record
 *
 * The filters are part of the list key, so two filter sets are two cache
 * entries and going back to a previous one is instant rather than a refetch.
 */
export const supportTicketKeys = {
  all: ["support-tickets"] as const,

  lists: () => [...supportTicketKeys.all, "list"] as const,
  list: (params: {
    page: number;
    perPage: number;
    filters: TicketFilterValues;
  }) => [...supportTicketKeys.lists(), params] as const,

  ticket: (id: number | string) => [...supportTicketKeys.all, id] as const,

  detail: (id: number | string) =>
    [...supportTicketKeys.ticket(id), "detail"] as const,
} as const;
