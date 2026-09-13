import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type { PickupRequest } from "../types";

/**
 * `/corporate/pickuprequests` — pickups booked by the signed-in corporate.
 *
 * The endpoint is scope-aware on the server: internal staff with
 * `manage_pickup_requests` see every request, a corporate caller sees only
 * their own. Which corporate that is comes from the `X-Corporate-Code` header
 * the private client attaches, so nothing here passes an owner id.
 */

const BASE = "/corporate/pickuprequests";

export const ENDPOINTS = {
  list: BASE,
  detail: (id: number | string) => `${BASE}/${id}`,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

export interface PickupListParams {
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

export interface PickupListResult {
  items: PickupRequest[];
  meta?: PageMeta;
}

/**
 * Picks the rows out of whichever envelope this endpoint uses.
 *
 * Documented as `data.pickuprequests`, with the neighbouring shapes accepted
 * too — a response we did not predict renders an empty table rather than
 * throwing.
 */
function readPickups(raw: unknown): PickupRequest[] {
  if (Array.isArray(raw)) return raw as PickupRequest[];
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.pickuprequests)) {
    return raw.pickuprequests as PickupRequest[];
  }

  const data = raw.data;
  if (Array.isArray(data)) return data as PickupRequest[];
  if (isRecord(data)) {
    if (Array.isArray(data.pickuprequests)) {
      return data.pickuprequests as PickupRequest[];
    }
    if (Array.isArray(data.data)) return data.data as PickupRequest[];
  }

  return [];
}

/**
 * One page of pickups.
 *
 * No filters: the endpoint documents `page` and `per_page` and nothing else.
 * Rather than send parameters it might ignore — which would look like a broken
 * filter bar — the list offers none until the API publishes some.
 *
 * `silent` because the table renders its own error card.
 */
export async function listPickupRequests({
  page = 1,
  perPage = 15,
  signal,
}: PickupListParams = {}): Promise<PickupListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    ENDPOINTS.list,
    undefined,
    {
      params: { page, per_page: perPage },
      silent: true,
      signal,
    },
  );

  return { items: readPickups(response.raw), meta: response.meta };
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Finds the single record inside the envelope.
 *
 * The detail route answers under the *plural* key — `data.pickuprequests`
 * holding one object — the same quirk the consignment, approval and ticket
 * routes have.
 */
function readPickup(raw: unknown): PickupRequest | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [
    data?.pickuprequests,
    data?.pickuprequest,
    raw.pickuprequests,
    raw.pickuprequest,
    data,
    raw,
  ];

  for (const candidate of candidates) {
    const record = Array.isArray(candidate) ? candidate[0] : candidate;
    if (isRecord(record) && looksLikePickup(record)) {
      return record as unknown as PickupRequest;
    }
  }

  return null;
}

/**
 * Is this the record, or the envelope around it?
 *
 * The pickup number is the strongest marker and never appears on a wrapper. An
 * `id` is the fallback, accepted as a string too — PHP hands back `"id": "42"`
 * often enough that requiring a number would turn a good response into "not
 * found".
 */
function looksLikePickup(value: Record<string, unknown>): boolean {
  if (typeof value.pickup_no === "string") return true;
  if (typeof value.id === "number") return true;
  return typeof value.id === "string" && value.id.trim() !== "";
}

export async function fetchPickupRequest(
  id: number | string,
  signal?: AbortSignal,
): Promise<PickupRequest> {
  const raw = await privateApiClient.get<unknown>(ENDPOINTS.detail(id), {
    // The page renders its own not-found; the client's toast would double up.
    silent: true,
    signal,
  });

  const pickup = readPickup(raw);
  if (!pickup) {
    throw new ApiError(404, "Pickup request not found.", { payload: raw });
  }

  return pickup;
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

export interface CreatePickupPayload {
  consignment_request_ids: number[];
  pickup_date: string;
  /** `H:i` — the API answers with seconds but takes it without. */
  pickup_time?: string;
  vehicle_type: string;
  remarks?: string;
}

/**
 * `POST /corporate/pickuprequests`.
 *
 * The interesting failures here are all 422s about the *set* of consignment
 * requests: they must share one customer or corporate, none may already be
 * collected, and none may sit on another still-open pickup. None of that is
 * checkable from the browser, so `silent` keeps the refusal off a toast and the
 * dialog renders it against the picker that caused it.
 */
export function createPickupRequest(
  payload: CreatePickupPayload,
): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ENDPOINTS.list, payload, {
    silent: true,
  });
}

/** The server's reason for refusing a booking, if it gave a specific one. */
export function pickupRefusalReason(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;

  const fields = error.fieldErrors;
  if (!fields) return error.message;

  // Laravel reports a bad member of the array under `consignment_request_ids.0`,
  // which is the one message worth hoisting — it names the offending row.
  const key = Object.keys(fields).find((name) =>
    name.startsWith("consignment_request_ids"),
  );

  return (key ? fields[key]?.[0] : undefined) ?? error.message;
}
