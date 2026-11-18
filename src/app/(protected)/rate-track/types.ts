import type { RateOption } from "@/app/(protected)/consignments/request/types";

/**
 * Types for the Check rate / Track page.
 *
 * A quote is the consignment request's own `RateOption`. Money stays a string
 * end to end, as the API sends it: it is displayed through `formatMoney` and
 * never computed with, apart from ordering the cards by price.
 */
export type { RateOption };

/* -------------------------------------------------------------------------- */
/* Check rate                                                                 */
/* -------------------------------------------------------------------------- */

export interface RateBox {
  length: number;
  width: number;
  height: number;
  weight: number;
}

/**
 * The `POST /corporate/check-rates` body. Only the country is required, plus
 * exactly one of `total_weight` or `boxes`; blank optionals are omitted.
 */
export interface CheckRatesInput {
  receiver_country: string;
  receiver_state?: string;
  receiver_city?: string;
  receiver_zip?: string;
  receiver_address_1?: string;
  receiver_address_2?: string;
  package_type?: string;
  /** A code from the `rate_check_item_types` meta list. */
  item_type?: string;
  total_weight?: number;
  boxes?: RateBox[];
}

/* -------------------------------------------------------------------------- */
/* Track                                                                      */
/* -------------------------------------------------------------------------- */

/** The `POST /corporate/track` body. */
export interface TrackInput {
  tracking_no: string;
  type?: string;
  entry?: string;
}

export interface TrackedParty {
  name: string;
  company: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  zip: string | null;
  address: string | null;
}

export interface TrackedConsignment {
  trackingNo: string | null;
  /** The house waybill — `null` until one is issued. */
  hawb: string | null;
  shipDate: string | null;
}

export interface TrackedLocation {
  location: string;
  country: string | null;
  state: string | null;
  city: string | null;
  comments: string | null;
  status: string;
  arrived_at: string | null;
  moved_at: string | null;
}

/**
 * What the API is willing to show about a shipment. Each block sits behind a
 * `show_*_info` flag; a withheld block is `null` here, so the UI renders what
 * is present rather than checking flags.
 */
export interface TrackResult {
  consignment: TrackedConsignment | null;
  sender: TrackedParty | null;
  receiver: TrackedParty | null;
  /** Newest first. */
  locations: TrackedLocation[];
}
