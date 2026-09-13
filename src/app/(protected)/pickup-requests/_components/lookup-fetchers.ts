import {
  fetchConsignments,
  type LookupListResult,
} from "@/shared/api/services/lookup.service";
import type { AsyncComboboxPage } from "@/shared/components/ui/async-combobox";

/**
 * The consignment lookup, in the shape `AsyncCombobox` calls.
 *
 * A module-level constant rather than an inline arrow because the combobox
 * lists `fetchPage` as a `useCallback` dependency — a new function identity on
 * every render would restart the debounce loop and re-request continuously.
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

export const consignmentFetcher = async (page: number, query: string) =>
  toPage(await fetchConsignments(page, PER_PAGE, query || undefined));
