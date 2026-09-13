/**
 * Every cache key in this feature, in one place.
 *
 *   ["pickup-requests"]                    → the whole feature
 *   ["pickup-requests", "list", { page }]  → one page of the table
 *   ["pickup-requests", id]                → everything about one pickup
 *   ["pickup-requests", id, "detail"]      → the record
 */
export const pickupRequestKeys = {
  all: ["pickup-requests"] as const,

  lists: () => [...pickupRequestKeys.all, "list"] as const,
  list: (params: { page: number; perPage: number }) =>
    [...pickupRequestKeys.lists(), params] as const,

  pickup: (id: number | string) => [...pickupRequestKeys.all, id] as const,

  detail: (id: number | string) =>
    [...pickupRequestKeys.pickup(id), "detail"] as const,
} as const;
