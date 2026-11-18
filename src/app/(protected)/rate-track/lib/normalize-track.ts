import type { TrackedLocation, TrackedParty, TrackResult } from "../types";

/**
 * The `data` of a track response → what the page shows. Read defensively: a
 * shape we did not predict yields an empty result ("nothing to show") rather
 * than a crash. Same contract as the customer portal's tracking page.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function optionalStr(value: unknown): string | null {
  const text = str(value);
  return text ? text : null;
}

/** Reads `sender_*` / `receiver_*` keys off one party block. */
function normalizeParty(prefix: "sender" | "receiver", block: unknown): TrackedParty | null {
  if (!isRecord(block)) return null;

  const get = (key: string) => optionalStr(block[`${prefix}_${key}`]);
  const address = [get("address_1"), get("address_2")].filter(Boolean).join(", ");

  return {
    name: [get("first_name"), get("last_name")].filter(Boolean).join(" "),
    company: get("company"),
    country: get("country"),
    state: get("state"),
    city: get("city"),
    zip: get("zip"),
    address: address || null,
  };
}

function normalizeLocation(row: Record<string, unknown>): TrackedLocation {
  return {
    location: str(row.location),
    country: optionalStr(row.country),
    state: optionalStr(row.state),
    city: optionalStr(row.city),
    comments: optionalStr(row.comments),
    status: str(row.status),
    arrived_at: optionalStr(row.arrived_at),
    moved_at: optionalStr(row.moved_at),
  };
}

/** Newest first — the API does not promise an order. */
function byMostRecent(a: TrackedLocation, b: TrackedLocation): number {
  const key = (l: TrackedLocation) => l.arrived_at ?? l.moved_at ?? "";
  return key(b).localeCompare(key(a));
}

/** A block is shown only when the API says so (`"Y"`). */
function shown(block: Record<string, unknown>, flag: string): boolean {
  return str(block[flag]).toUpperCase() === "Y";
}

export function normalizeTrackResponse(data: unknown): TrackResult {
  const body = isRecord(data) ? data : {};
  const consignment = isRecord(body.consignment) ? body.consignment : {};
  const info = isRecord(consignment.consignment_info) ? consignment.consignment_info : null;

  const locations = Array.isArray(body.locations)
    ? body.locations.filter(isRecord).map(normalizeLocation).sort(byMostRecent)
    : [];

  return {
    consignment:
      info && shown(consignment, "show_consignment_info")
        ? {
            trackingNo: optionalStr(info.tracking_no),
            hawb: optionalStr(info.hawb),
            shipDate: optionalStr(info.ship_date),
          }
        : null,
    sender: shown(consignment, "show_sender_info")
      ? normalizeParty("sender", consignment.sender_info)
      : null,
    receiver: shown(consignment, "show_receiver_info")
      ? normalizeParty("receiver", consignment.receiver_info)
      : null,
    locations,
  };
}
