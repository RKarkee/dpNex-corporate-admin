import {
  fetchConsignments,
  fetchCorporates,
  fetchCustomers,
  type LookupListResult,
} from "@/shared/api/services/lookup.service";
import type { AsyncComboboxPage } from "@/shared/components/ui/async-combobox";

/**
 * The three lookups this feature searches, in the shape `AsyncCombobox` calls.
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

export const corporateFetcher = async (page: number, query: string) =>
  toPage(await fetchCorporates(page, PER_PAGE, query || undefined));

export const customerFetcher = async (page: number, query: string) =>
  toPage(await fetchCustomers(page, PER_PAGE, query || undefined));

export const consignmentFetcher = async (page: number, query: string) =>
  toPage(await fetchConsignments(page, PER_PAGE, query || undefined));
