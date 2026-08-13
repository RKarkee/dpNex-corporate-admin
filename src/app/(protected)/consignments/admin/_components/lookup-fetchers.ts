import {
  fetchCurrencies,
  fetchHsCodes,
  fetchManufacturers,
  fetchMaterials,
  fetchPackageTypes,
  type LookupListResult,
} from "@/shared/api/services/lookup.service";
import type { AsyncComboboxPage } from "@/shared/components/ui/async-combobox";

/**
 * The lookup services, in the shape `AsyncCombobox` calls.
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

export const packageTypeFetcher = async (page: number, query: string) =>
  toPage(await fetchPackageTypes(page, PER_PAGE, query || undefined));

export const materialFetcher = async (page: number, query: string) =>
  toPage(await fetchMaterials(page, PER_PAGE, query || undefined));

export const hsCodeFetcher = async (page: number, query: string) =>
  toPage(await fetchHsCodes(page, PER_PAGE, query || undefined));

export const currencyFetcher = async (page: number, query: string) =>
  toPage(await fetchCurrencies(page, PER_PAGE, query || undefined));

export const manufacturerFetcher = async (page: number, query: string) =>
  toPage(await fetchManufacturers(page, PER_PAGE, query || undefined));
