import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type { ConsignmentLocation } from "../types";
import { requiresForwarder } from "../types";

/**
 * `/corporate/consignmentrequests/{id}/locations` — the tracking scans.
 *
 * **The envelope trap.** Both the list and the detail answer under the same
 * `data.locations` key, but the list holds an array and the detail holds a
 * single object. Reading them with one helper would silently hand a component
 * an object where it expected rows, so the two readers are separate and each
 * asserts the shape it needs.
 *
 * Updates are a real `PATCH`, not the `POST` + `_method` spoof the document and
 * box resources use. That spoof exists only because PHP will not populate
 * `$_FILES` for a multipart PATCH body — locations carry no files, so the body
 * is plain JSON and the honest verb works.
 */

function basePath(requestId: number | string): string {
  return `/corporate/consignmentrequests/${requestId}/locations`;
}

function rowPath(requestId: number | string, locationId: number | string) {
  return `${basePath(requestId)}/${locationId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unexpectedShape(raw: unknown): ApiError {
  return new ApiError(502, "Unexpected response from the service.", {
    payload: raw,
  });
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalStr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeLocation(
  row: Record<string, unknown>,
): ConsignmentLocation | null {
  // A row without a usable id cannot be viewed, edited or deleted, so it is
  // dropped rather than rendered as a dead row.
  if (typeof row.id !== "number") return null;

  return {
    id: row.id,
    location: str(row.location),
    country: str(row.country),
    state: optionalStr(row.state),
    city: optionalStr(row.city),
    comments: optionalStr(row.comments),
    status: str(row.status),
    forwarder_code: optionalStr(row.forwarder_code),
    new_tracking_no: optionalStr(row.new_tracking_no),
    location_date: optionalStr(row.location_date),
    arrived_at: optionalStr(row.arrived_at),
    moved_at: optionalStr(row.moved_at),
    created_at: optionalStr(row.created_at),
    updated_at: optionalStr(row.updated_at),
  };
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

export interface LocationPage {
  items: ConsignmentLocation[];
  meta: PageMeta | undefined;
}

/**
 * One page of locations.
 *
 * `unwrap: "locations"` reaches past the `consignmentrequest` sibling the
 * response also carries — that copy of the parent record is not this feature's
 * concern, and the tab already has the request from its own query.
 */
export async function listLocations({
  requestId,
  page,
  perPage = 10,
  signal,
}: {
  requestId: number | string;
  page: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<LocationPage> {
  const { items, meta } = await privateApiClient.paginated<unknown>(
    basePath(requestId),
    {
      params: { page, per_page: perPage },
      unwrap: "locations",
      silent: true,
      signal,
    },
  );

  return {
    items: items.filter(isRecord).flatMap((row) => {
      const parsed = normalizeLocation(row);
      return parsed ? [parsed] : [];
    }),
    meta,
  };
}

/**
 * One location, read fresh when a dialog opens.
 *
 * Note the singular record arrives under the **plural** `locations` key — the
 * same key the list uses for its array. An array here would be the list
 * response leaking through, so it is unwrapped to its first entry rather than
 * trusted blindly.
 */
export async function fetchLocation(
  requestId: number | string,
  locationId: number,
  signal?: AbortSignal,
): Promise<ConsignmentLocation> {
  const raw = await privateApiClient.get<unknown>(
    rowPath(requestId, locationId),
    { silent: true, signal },
  );

  if (!isRecord(raw)) throw unexpectedShape(raw);

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates: unknown[] = [
    data?.locations,
    data?.location,
    raw.locations,
    raw.location,
    data,
  ];

  for (const candidate of candidates) {
    const record = Array.isArray(candidate) ? candidate[0] : candidate;
    if (!isRecord(record)) continue;

    const parsed = normalizeLocation(record);
    if (parsed) return parsed;
  }

  throw unexpectedShape(raw);
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

export interface LocationInput {
  status: string;
  /** `"Y"` when the scan records a place; `"N"` when it only moves the status. */
  have_new_location: "Y" | "N";
  location?: string;
  country?: string;
  /** The state **name**, not the picker's iso2 code — see `toLocationPayload`. */
  state?: string;
  city?: string;
  comments?: string;
  forwarder_code?: string;
  new_tracking_no?: string;
  location_date?: string;
  arrived_at?: string;
  moved_at?: string;
}

/**
 * Form values → wire payload.
 *
 * Two rules the API enforces and this mirrors, so a request never carries a
 * field the server will reject or ignore:
 *
 * - **Place fields only when `have_new_location` is `Y`.** The docs say they
 *   are "only read" otherwise, but sending a half-filled address alongside `N`
 *   invites a validator to disagree.
 * - **Forwarder fields only for `FORWARDED_WITH`.** `new_tracking_no` is
 *   required *because* `forwarder_code` was supplied, so the two travel
 *   together or not at all — sending the tracking number alone would trip a
 *   rule the user never saw.
 *
 * Blank optional strings are dropped rather than sent as `""`, which Laravel
 * would happily store over an existing value.
 */
export function toLocationPayload(input: LocationInput): Record<string, unknown> {
  const text = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };

  const payload: Record<string, unknown> = {
    status: input.status,
    have_new_location: input.have_new_location,
  };

  if (input.have_new_location === "Y") {
    payload.location = text(input.location);
    payload.country = text(input.country);
    payload.state = text(input.state);
    payload.city = text(input.city);
    payload.location_date = text(input.location_date);
    payload.arrived_at = text(input.arrived_at);
    payload.moved_at = text(input.moved_at);
  }

  // Comments describe the scan, not the place, so they are sent either way.
  payload.comments = text(input.comments);

  if (requiresForwarder(input.status)) {
    payload.forwarder_code = text(input.forwarder_code);
    payload.new_tracking_no = text(input.new_tracking_no);
  }

  // One pass to drop the `undefined`s the branches above left behind.
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }

  return payload;
}

export function createLocation(
  requestId: number | string,
  input: LocationInput,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "POST",
    basePath(requestId),
    toLocationPayload(input),
    { silent: true },
  );
}

export function updateLocation(
  requestId: number | string,
  locationId: number,
  input: LocationInput,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "PATCH",
    rowPath(requestId, locationId),
    toLocationPayload(input),
    { silent: true },
  );
}

export function deleteLocation(
  requestId: number | string,
  locationId: number,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "DELETE",
    rowPath(requestId, locationId),
    undefined,
    { silent: true },
  );
}
