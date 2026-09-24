/**
 * Domain types for the charges (cost line items) on one consignment request.
 *
 * A standalone feature, like `locations/` next door — its own types, service,
 * hooks and components, importing nothing from a sibling tab.
 */

/**
 * One charge. `quantity`, `rate` and `amount` stay numeric *strings* end to
 * end — that is the API's own contract for them — and are only formatted for
 * display, so nothing is lost to float rounding on a round trip.
 */
export interface ConsignmentCharge {
  id: number;
  name: string;
  description: string | null;
  quantity: string;
  quantity_code: string;
  rate: string;
  amount: string;
  currency: string | null;
  base_currency: string | null;
  exchange_rate: string | null;
  /** `Y` — added by the pricing engine; `N` — added by hand. */
  is_system_generated: "Y" | "N";
}

/** The create / update body. Identical for both verbs. */
export interface ChargeInput {
  name: string;
  description?: string;
  quantity: string;
  quantity_code: string;
  rate: string;
  amount: string;
}

/** The list's own query params — nothing is offered the API cannot filter on. */
export interface ChargeFilters {
  /** Exact match on the charge name. */
  name: string;
  quantity_code: string;
  /** `""` both, `"true"` pricing-engine rows, `"false"` manual rows. */
  is_system_generated: "" | "true" | "false";
  perPage: number;
}

export const DEFAULT_CHARGE_FILTERS: ChargeFilters = {
  name: "",
  quantity_code: "",
  is_system_generated: "",
  perPage: 10,
};

export const PER_PAGE_OPTIONS = [10, 25, 50, 100].map((value) => ({
  value: String(value),
  label: `${value} per page`,
}));

export const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "true", label: "System generated" },
  { value: "false", label: "Manually added" },
];

/** `"39.0000"` → `"39.00"`; anything unparseable is shown as sent. */
export function formatAmount(value?: string | null): string {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : value;
}
