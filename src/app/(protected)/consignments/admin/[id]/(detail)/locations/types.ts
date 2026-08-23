/**
 * Domain types for the tracking locations on one accepted consignment.
 *
 * A standalone feature, like `documents/` next door — its own types, service,
 * hooks and components, importing nothing from a sibling tab.
 *
 * **Read-only.** Scans are recorded against the consignment request while it is
 * being handled; here they are history. So this carries no write payload, no
 * conditional field rules and none of the date-input helpers the request
 * module's form needs.
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
/* Status labelling                                                           */
/* -------------------------------------------------------------------------- */

/** One `{ value, label }` pair, as `next_statuses` supplies them. */
export interface StatusOption {
  value: string;
  label: string;
}

/**
 * `PENDING_INTERNAL_APPROVAL` → `Pending internal approval`.
 *
 * A fallback for a code the API did not label. `next_statuses` lists only where
 * a record may go *next*, so a status it has already passed through is absent —
 * and showing raw SCREAMING_SNAKE in a table is worse than a good guess at the
 * same words the backend would have used.
 */
export function humanizeStatus(code: string): string {
  const words = code.trim().replace(/_+/g, " ").toLowerCase();
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The API's own copy for a status, falling back to a humanised code.
 *
 * `statuses` defaults to empty because the consignment detail response carries
 * no `next_statuses` — this tab is read-only, so there is no transition list to
 * read. Every label therefore comes from `humanizeStatus`, and the parameter
 * stays only so a future response that *does* label its statuses can be passed
 * straight through without touching the call sites.
 */
export function statusLabel(
  status: string,
  statuses: StatusOption[] = [],
): string {
  if (!status) return "—";
  return (
    statuses.find((option) => option.value === status)?.label ??
    humanizeStatus(status)
  );
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



