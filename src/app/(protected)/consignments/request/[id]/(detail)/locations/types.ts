/**
 * Domain types for the tracking locations on one consignment request.
 *
 * A standalone feature, like `documents/` next door — its own types, service,
 * hooks and components, importing nothing from a sibling tab.
 */

/** A scan: where the shipment was, when it arrived, and when it left. */
export interface ConsignmentLocation {
  id: number;
  location: string;
  /** iso2 code. */
  country: string;
  /**
   * The API returns a *name* here (`CALIFORNIA`), not the iso2 code the
   * country/state picker stores (`CA`). See `toLocationPayload`.
   */
  state?: string | null;
  city?: string | null;
  comments?: string | null;
  status: string;
  forwarder_code?: string | null;
  new_tracking_no?: string | null;
  location_date?: string | null;
  /** `YYYY-MM-DD HH:mm:ss`. */
  arrived_at?: string | null;
  moved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Conditional rules                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The one status that demands an onward carrier.
 *
 * Named rather than inlined because three places test it: the form (to reveal
 * the forwarder field), the validator (to require it), and the payload builder
 * (to decide whether to send it).
 */
export const FORWARDED_WITH = "FORWARDED_WITH";

export function requiresForwarder(status: string): boolean {
  return status === FORWARDED_WITH;
}

/**
 * Countries where the state is part of a deliverable address, and therefore
 * required whenever a new location is recorded.
 *
 * Everywhere else the API treats state as optional — so this is a whitelist,
 * not a guess about which countries have states.
 */
const STATE_REQUIRED_COUNTRIES = new Set(["NP", "IN"]);

export function requiresState(country: string): boolean {
  return STATE_REQUIRED_COUNTRIES.has(country.toUpperCase());
}

/* -------------------------------------------------------------------------- */
/* Display helpers                                                            */
/* -------------------------------------------------------------------------- */

/** `Los Angeles, CALIFORNIA, US` — the parts that exist, in order. */
export function locationPlace(row: ConsignmentLocation): string {
  return [row.city, row.state, row.country].filter(Boolean).join(", ") || "—";
}

/**
 * `2026-06-05 10:15:00` → `2026-06-05 10:15`.
 *
 * Seconds are noise on a scan timestamp, and the raw value is wide enough to
 * force a table column to wrap.
 */
export function shortDateTime(value?: string | null): string {
  const text = value?.trim();
  if (!text) return "—";
  return text.slice(0, 16);
}

/** The `YYYY-MM-DD` an `<input type="date">` accepts. */
export function toDateInput(value?: string | null): string {
  return value?.slice(0, 10) ?? "";
}

/**
 * The `YYYY-MM-DDTHH:mm` an `<input type="datetime-local">` accepts.
 *
 * The API speaks `YYYY-MM-DD HH:mm:ss`; the space and the seconds both have to
 * go or the input renders blank with no error.
 */
export function toDateTimeInput(value?: string | null): string {
  const text = value?.trim();
  if (!text) return "";
  return text.slice(0, 16).replace(" ", "T");
}

/** The reverse: `2026-06-05T10:15` → `2026-06-05 10:15:00`. */
export function fromDateTimeInput(value: string): string | undefined {
  const text = value.trim();
  if (!text) return undefined;
  return `${text.replace("T", " ")}:00`.slice(0, 19);
}
