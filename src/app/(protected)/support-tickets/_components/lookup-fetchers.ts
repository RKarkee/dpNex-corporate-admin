import {
  fetchAssignables,
  fetchConsignments,
  fetchCorporates,
  fetchCorporateUsers,
  fetchCustomers,
  type LookupListResult,
} from "@/shared/api/services/lookup.service";
import type { AsyncComboboxPage } from "@/shared/components/ui/async-combobox";

/**
 * The five lookups this feature searches, in the shape `AsyncCombobox` calls.
 *
 * Module-level constants rather than inline arrows because the combobox lists
 * `fetchPage` as a `useCallback` dependency — a new function identity on every
 * render would restart the debounce loop and re-request the list continuously.
 */

const PER_PAGE = 20;

function toPage(result: LookupListResult): AsyncComboboxPage {
  return {
    options: result.data.map((option) => ({
      value: String(option.value),
      label: option.label,
    })),
    hasMore: result.meta.has_more,
  };
}

/** Staff who can own a ticket. */
export const assignableFetcher = async (page: number, query: string) =>
  toPage(await fetchAssignables(page, PER_PAGE, query || undefined));

/** Colleagues inside the caller's own corporate — who raised a ticket. */
export const corporateUserFetcher = async (page: number, query: string) =>
  toPage(await fetchCorporateUsers(page, PER_PAGE, query || undefined));

export const corporateFetcher = async (page: number, query: string) =>
  toPage(await fetchCorporates(page, PER_PAGE, query || undefined));

export const customerFetcher = async (page: number, query: string) =>
  toPage(await fetchCustomers(page, PER_PAGE, query || undefined));

export const consignmentFetcher = async (page: number, query: string) =>
  toPage(await fetchConsignments(page, PER_PAGE, query || undefined));
