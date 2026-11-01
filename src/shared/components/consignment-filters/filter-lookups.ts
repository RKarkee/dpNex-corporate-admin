import {
  fetchAgents,
  fetchAgentServices,
  fetchBatches,
  fetchBranches,
  fetchCorporates,
  fetchCustomers,
  fetchIntegratorMasters,
  fetchIntegrators,
  fetchUsers,
  fetchVias,
  type LookupListResult,
} from "@/shared/api/services/lookup.service";
import type { AsyncComboboxPage } from "@/shared/components/ui/async-combobox";

/**
 * The lookup lists the consignment filters render, in the shape AsyncCombobox
 * expects. Module-scope references: an inline fetcher restarts the combobox's
 * fetch loop on every render.
 */

const PER_PAGE = 20;

function toPage(result: LookupListResult): AsyncComboboxPage {
  return {
    options: result.data.map((o) => ({
      value: String(o.value),
      label: o.label,
    })),
    hasMore: result.meta.has_more,
  };
}

export const viaFetcher = async (page: number, query: string) =>
  toPage(await fetchVias(page, PER_PAGE, query || undefined));

export const agentFetcher = async (page: number, query: string) =>
  toPage(await fetchAgents(page, PER_PAGE, query || undefined));

export const serviceFetcher = async (page: number, query: string) =>
  toPage(await fetchAgentServices(page, PER_PAGE, query || undefined));

export const customerFetcher = async (page: number, query: string) =>
  toPage(await fetchCustomers(page, PER_PAGE, query || undefined));

export const corporateFetcher = async (page: number, query: string) =>
  toPage(await fetchCorporates(page, PER_PAGE, query || undefined));

export const userFetcher = async (page: number, query: string) =>
  toPage(await fetchUsers(page, PER_PAGE, query || undefined));

export const branchFetcher = async (page: number, query: string) =>
  toPage(await fetchBranches(page, PER_PAGE, query || undefined));

export const batchFetcher = async (page: number, query: string) =>
  toPage(await fetchBatches(page, PER_PAGE, query || undefined));

/**
 * Integrator source: with a via, the per-lane list; without one, the
 * via-independent master list. The caller memoises this on `viaCode`, so a new
 * lane hands AsyncCombobox a fresh `fetchPage` and it reloads from page 1.
 */
export const makeIntegratorFetcher =
  (viaCode?: string) => async (page: number, query: string) =>
    toPage(
      viaCode
        ? await fetchIntegrators(page, PER_PAGE, query || undefined, viaCode)
        : await fetchIntegratorMasters(page, PER_PAGE, query || undefined),
    );
