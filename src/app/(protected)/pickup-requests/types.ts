/**
 * Pickup requests — a van booked to collect consignments that are already
 * waiting.
 *
 * Scope is the API's: internal staff see everything, a corporate caller sees
 * only their own. Nothing here re-checks that; it only avoids claiming
 * otherwise in the copy.
 */

export const VEHICLE_TYPES = [
  "BIKE",
  "SCOOTER",
  "SMALL_VAN",
  "LARGE_VAN",
  "MINI_TRUCK",
  "TRUCK",
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

/** Small enough to carry a document, large enough to need a loading bay. */
export const DEFAULT_VEHICLE_TYPE: VehicleType = "SMALL_VAN";

/**
 * A consignment request as the pickup detail carries it.
 *
 * The rows arrive nested on the pickup, not fetched separately — which is the
 * difference between "3 requests" and being able to say which three. Only the
 * fields this page renders are typed; the payload carries far more (every
 * `can_*` permission flag, charges, task codes) and none of it belongs here.
 */
export interface PickupConsignment {
  id: number;
  request_tracking_id?: string | null;
  status?: string | null;
  status_label?: string | null;
  urgency?: string | null;

  /** Routing — who moves it and how. */
  package_type?: string | null;
  service_code?: string | null;
  via_code?: string | null;
  agent_code?: string | null;
  integrator_code?: string | null;
  product_type?: string | null;
  mode_of_transport?: string | null;

  /** Weights are null until the boxes are declared — not zero. */
  no_of_boxes?: number | null;
  total_weight?: number | string | null;
  actual_total_weight?: number | string | null;
  total_volumetric_weight?: number | string | null;

  /** What is in it, and what it is worth. */
  consignment_goods_desc?: string | null;
  nature_of_goods?: string | null;
  consignment_hs_code?: string | null;
  declared_value?: number | string | null;
  declared_currency?: string | null;

  /** Dates, as `2026-03-29` or `2026-09-09 14:30:00`. */
  ship_date?: string | null;
  pickup_time?: string | null;
  picked_up_at?: string | null;
  preferred_delivery_time?: string | null;

  pickup_note?: string | null;
  delivery_note?: string | null;
  shipper_reference_code?: string | null;

  sender?: {
    sender_first_name?: string | null;
    sender_last_name?: string | null;
    sender_company?: string | null;
    sender_phone?: string | null;
    sender_email?: string | null;
    sender_address_1?: string | null;
    sender_address_2?: string | null;
    sender_city?: string | null;
    sender_state?: string | null;
    sender_state_name?: string | null;
    sender_zip?: string | null;
    sender_country?: string | null;
  } | null;

  receiver?: {
    receiver_first_name?: string | null;
    receiver_last_name?: string | null;
    receiver_company?: string | null;
    receiver_phone?: string | null;
    receiver_email?: string | null;
    receiver_address_1?: string | null;
    receiver_address_2?: string | null;
    receiver_city?: string | null;
    receiver_state?: string | null;
    receiver_state_name?: string | null;
    receiver_zip?: string | null;
    receiver_country?: string | null;
  } | null;
}

export interface PickupRequest {
  id: number;
  pickup_no: string;
  user_id?: number | null;
  customer_id?: number | null;
  corporate_id?: number | null;

  pickup_date?: string | null;
  /** `14:30:00` on the way back, `14:30` on the way out. */
  pickup_time?: string | null;
  vehicle_type?: VehicleType | string | null;

  total_weight?: number | string | null;
  total_boxes?: number | string | null;
  consignment_request_count?: number | null;

  remarks?: string | null;

  /** Present on the detail response only — the list sends just the count. */
  consignment_requests?: PickupConsignment[] | null;

  status: string;
  /** The server's own wording. Preferred over anything derived locally. */
  status_label?: string | null;
  /**
   * The workflow's own bookkeeping — empty on every payload seen so far. This
   * portal reports the status; it does not drive the transitions.
   */
  next_statuses?: string[] | null;

  assigned_to_id?: number | null;
  /** The driver's name once one is set; null until then. */
  assigned_to?: string | null;
  assigned_at?: string | null;

  cancelled_by_id?: number | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
}

/** `"SMALL_VAN"` → `"Small van"`. */
export function humanize(value: string): string {
  const words = value.toLowerCase().split("_").filter(Boolean);
  const [firstWord, ...restWords] = words;
  if (!firstWord) return "";
  return [firstWord.charAt(0).toUpperCase() + firstWord.slice(1), ...restWords].join(" ");
}

export function vehicleLabel(value?: string | null): string {
  const raw = String(value ?? "").trim();
  return raw ? humanize(raw) : "—";
}

/**
 * `14:30:00` → `14:30`.
 *
 * Read off the string rather than parsed into a `Date`: there is no date part
 * to anchor it to, and constructing one would drag the browser's timezone into
 * a time the API stated plainly.
 */
export function formatTime(value?: string | null): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.slice(0, 5);
}

/**
 * The rows on a pickup, and how many there are.
 *
 * The count and the array disagree on an older record — the count is what the
 * list has and the array is what the detail has — so the array wins wherever it
 * exists and the count is the fallback.
 */
export function pickupConsignments(pickup: PickupRequest): PickupConsignment[] {
  return Array.isArray(pickup.consignment_requests)
    ? pickup.consignment_requests
    : [];
}

export function consignmentCount(pickup: PickupRequest): number {
  const rows = pickupConsignments(pickup);
  return rows.length || pickup.consignment_request_count || 0;
}

/**
 * `Kathmandu, NP` — from whichever half of an address survived.
 *
 * Some string fields come back padded with a wall of trailing spaces, so every
 * part is trimmed before it is joined.
 */
export function place(city?: string | null, country?: string | null): string {
  const parts = [city?.trim(), country?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

/**
 * `"John"`, `"Doe"`, `"ABC Pvt Ltd"` → `"ABC Pvt Ltd · John Doe"`.
 *
 * The company is what a driver looks for on a door; the person is who they ask
 * for once inside. Either may be missing, and both arrive padded.
 */
export function partyName(
  first?: string | null,
  last?: string | null,
  company?: string | null,
): string {
  const person = [first?.trim(), last?.trim()].filter(Boolean).join(" ");
  const org = company?.trim();

  if (org && person) return `${org} · ${person}`;
  return org || person || "—";
}

/** The postal lines of an address, in reading order, blanks dropped. */
export function addressLines(parts: (string | null | undefined)[]): string[] {
  return parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
}

/**
 * `"1000.5000"` → `"1,000.50"`.
 *
 * Declared value arrives as a string with four decimal places, which is a
 * database column speaking rather than an amount a person would write.
 */
export function formatDeclared(
  value?: number | string | null,
  currency?: string | null,
): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const code = currency?.trim();
  return code ? `${formatted} ${code}` : formatted;
}

/** A weight that is `null` until the boxes are declared, which is not `0`. */
export function formatWeight(value?: number | string | null): string | null {
  if (value === null || value === undefined || value === "") return null;

  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return null;

  return `${amount} kg`;
}

/** Whether this request was called off, and therefore why. */
export function isCancelled(pickup: PickupRequest): boolean {
  if (pickup.cancelled_at) return true;
  return String(pickup.status).toUpperCase() === "CANCELLED";
}
