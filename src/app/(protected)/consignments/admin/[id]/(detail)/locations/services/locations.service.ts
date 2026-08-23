import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type { ConsignmentLocation } from "../types";

/**
 * `/corporate/consignments/{id}/locations` — the tracking scans, read-only.
 *
 * **The envelope trap.** Both the list and the detail answer under the same
 * `data.locations` key, but the list holds an array and the detail holds a
 * single object. Reading them with one helper would silently hand a component
 * an object where it expected rows, so the two readers are separate and each
 * asserts the shape it needs.
 *
 * Reads only: this tab lists the scans and opens one as a details dialog.
 * Recording and correcting them belongs to the consignment *request*, which
 * owns the same resource under `/corporate/consignmentrequests`.
 */

function basePath(consignmentId: number | string): string {
  return `/corporate/consignments/${consignmentId}/locations`;
}

function rowPath(consignmentId: number | string, locationId: number | string) {
  return `${basePath(consignmentId)}/${locationId}`;
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
  consignmentId,
  page,
  perPage = 10,
  signal,
}: {
  consignmentId: number | string;
  page: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<LocationPage> {
  const { items, meta } = await privateApiClient.paginated<unknown>(
    basePath(consignmentId),
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
  consignmentId: number | string,
  locationId: number,
  signal?: AbortSignal,
): Promise<ConsignmentLocation> {
  const raw = await privateApiClient.get<unknown>(
    rowPath(consignmentId, locationId),
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
