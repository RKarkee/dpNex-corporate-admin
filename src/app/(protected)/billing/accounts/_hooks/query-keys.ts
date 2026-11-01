import type { BillingAccountFilterValues } from "../types";

/**
 * Every cache key in this feature.
 *
 *   ["billing-accounts"]                       → the whole feature
 *   ["billing-accounts", "list", { page, … }]  → one page of the table
 *   ["billing-accounts", "detail", id]         → one account
 *
 * Changing the default touches two accounts — the new one and the one that
 * loses it — so writes invalidate `all` rather than a single detail.
 */
export const billingAccountKeys = {
  all: ["billing-accounts"] as const,

  lists: () => [...billingAccountKeys.all, "list"] as const,
  list: (params: {
    page: number;
    perPage: number;
    filters: BillingAccountFilterValues;
  }) => [...billingAccountKeys.lists(), params] as const,

  detail: (id: number | string) =>
    [...billingAccountKeys.all, "detail", id] as const,
} as const;
