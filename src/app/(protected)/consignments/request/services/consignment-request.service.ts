import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type {
  CheckRatesPayload,
  CheckRatesResult,
  ConsignmentBoxDetail,
  ConsignmentDetailResult,
  ConsignmentRequestDetail,
  ConsignmentRequestListItem,
  CreateConsignmentRequestPayload,
  UpdateConsignmentRequestPayload,
} from "../types";

/**
 * `/corporate/consignmentrequests` — consignment requests for the signed-in
 * corporate.
 *
 * The customer portal talks to the same resource under `/external/…`; this app
 * only ever uses the corporate scope. Which corporate is implied by the
 * `X-Corporate-Code` header the private client attaches, so no request here
 * passes an id — the endpoint cannot see outside the caller's own corporate.
 *
 * Paths live in `ENDPOINTS` rather than inline so the prefix is one edit away
 * if the API ever re-mounts the resource.
 */

const BASE = "/corporate/consignmentrequests";

export const ENDPOINTS = {
  checkRates: "/corporate/check-rates",
  list: BASE,
  detail: (id: number | string) => `${BASE}/${id}`,
  boxes: (id: number | string) => `${BASE}/${id}/boxes`,
  box: (id: number | string, boxId: number | string) => `${BASE}/${id}/boxes/${boxId}`,
  items: (id: number | string, boxId: number | string) =>
    `${BASE}/${id}/boxes/${boxId}/items`,
  item: (id: number | string, boxId: number | string, itemId: number | string) =>
    `${BASE}/${id}/boxes/${boxId}/items/${itemId}`,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* -------------------------------------------------------------------------- */
/* Rates                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * `POST /corporate/check-rates` — the quotes for a destination and weight.
 *
 * Step one of creating a request: the user picks one of these, and the chosen
 * object travels to the create endpoint untouched as `selected_rate`.
 *
 * `silent` because the form shows the failure in place, next to the inputs
 * that caused it.
 */
export async function checkRates(
  payload: CheckRatesPayload,
  signal?: AbortSignal,
): Promise<CheckRatesResult> {
  const data = await privateApiClient.post<unknown>(
    ENDPOINTS.checkRates,
    payload,
    { silent: true, signal },
  );

  if (isRecord(data) && Array.isArray(data.rates)) {
    return { rates: data.rates as CheckRatesResult["rates"] };
  }

  // A quote-less response is a legitimate answer ("nothing serves that lane"),
  // not a failure — the page renders an empty-state for it.
  return { rates: [] };
}

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

export interface ConsignmentRequestListParams {
  page?: number;
  perPage?: number;
  /** Sent to the API, so it matches across every page — not just this one. */
  search?: string;
  signal?: AbortSignal;
}

export interface ConsignmentRequestListResult {
  items: ConsignmentRequestListItem[];
  meta?: PageMeta;
}

/**
 * Picks the rows out of whichever envelope this endpoint uses.
 *
 * The API's list endpoints disagree about where the array lives —
 * `data.consignmentrequests` here, `data.data` elsewhere, bare at the top
 * level for a few. Taking the first array we recognise means a shape we did
 * not predict renders an empty table instead of throwing.
 */
function readRequests(raw: unknown): ConsignmentRequestListItem[] {
  if (Array.isArray(raw)) return raw as ConsignmentRequestListItem[];
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.consignmentrequests)) {
    return raw.consignmentrequests as ConsignmentRequestListItem[];
  }

  const data = raw.data;
  if (Array.isArray(data)) return data as ConsignmentRequestListItem[];
  if (isRecord(data)) {
    if (Array.isArray(data.consignmentrequests)) {
      return data.consignmentrequests as ConsignmentRequestListItem[];
    }
    if (Array.isArray(data.data)) return data.data as ConsignmentRequestListItem[];
  }

  return [];
}

/**
 * One page of requests, optionally filtered.
 *
 * `search` goes to the API rather than being applied to the rows in the
 * browser. Filtering the current page locally looks the same on page one and
 * is wrong everywhere else — it can only ever match the fifteen rows already
 * loaded, so a tracking id on page four appears not to exist.
 *
 * Empty params are dropped by the client, so no `search` key is sent when the
 * box is empty.
 */
export async function listConsignmentRequests({
  page = 1,
  perPage = 15,
  search,
  signal,
}: ConsignmentRequestListParams = {}): Promise<ConsignmentRequestListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    ENDPOINTS.list,
    undefined,
    {
      params: { page, per_page: perPage, search: search?.trim() || undefined },
      // The table renders its own error card; the client's toast would double up.
      silent: true,
      signal,
    },
  );

  return { items: readRequests(response.raw), meta: response.meta };
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Finds the single record inside the envelope.
 *
 * The detail route answers under the *plural* key — `data.consignmentrequests`
 * holding one object — the same quirk `/corporate/users/{id}` has. A numeric
 * `id` is what distinguishes the record from the wrapper around it.
 */
function readRequest(raw: unknown): ConsignmentRequestDetail | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [
    data?.consignmentrequests,
    data?.consignmentrequest,
    raw.consignmentrequests,
    raw.consignmentrequest,
    data,
    raw,
  ];

  for (const candidate of candidates) {
    // Some routes answer under the plural key with the single record wrapped in
    // an array; take the first entry rather than rejecting the whole response.
    const record = Array.isArray(candidate) ? candidate[0] : candidate;
    if (isRecord(record) && looksLikeRequest(record)) {
      return record as unknown as ConsignmentRequestDetail;
    }
  }

  return null;
}

/**
 * Is this the record, or the envelope around it?
 *
 * An `id` is the usual tell, but it is not enough on its own: PHP hands back
 * `"id": "42"` as a string often enough that requiring a number would turn a
 * perfectly good response into "Request not found" — which, from the edit page,
 * looks like the feature is broken rather than the record missing.
 *
 * The tracking id and the party objects are the other two markers; any one of
 * the three is a record, and none of them appear on a wrapper.
 */
function looksLikeRequest(value: Record<string, unknown>): boolean {
  if (typeof value.id === "number") return true;
  if (typeof value.id === "string" && value.id.trim() !== "") return true;
  if (typeof value.request_tracking_id === "string") return true;
  return isRecord(value.sender) || isRecord(value.receiver);
}

/**
 * One request, for the detail and edit pages.
 *
 * Boxes may arrive nested on the record or as a sibling of it; both are read,
 * because the edit form cannot seed its box array without them.
 *
 * Throws when the id resolves to nothing, which the page turns into "not
 * found" — the same answer a deleted id, a mistyped one, and another
 * corporate's id all deserve.
 */
export async function fetchConsignmentRequest(
  id: number,
  signal?: AbortSignal,
): Promise<ConsignmentDetailResult> {
  const raw = await privateApiClient.get<unknown>(ENDPOINTS.detail(id), {
    // The page renders its own not-found; the client's toast would double up.
    silent: true,
    signal,
  });

  const request = readRequest(raw);
  if (!request) {
    throw new ApiError(404, "Consignment request not found.", { payload: raw });
  }

  const nested = Array.isArray(request.boxes) ? request.boxes : undefined;
  const sibling =
    isRecord(raw) && isRecord(raw.data) && Array.isArray(raw.data.boxes)
      ? (raw.data.boxes as ConsignmentBoxDetail[])
      : undefined;

  return { request, boxes: nested ?? sibling ?? [] };
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * `POST /corporate/consignmentrequests`.
 *
 * JSON, not multipart — unlike the user endpoints, there is no file here, and
 * the body nests three levels deep (request → boxes → items), which `FormData`
 * would flatten into bracket-notation keys for no gain.
 *
 * `silent` so a 422 lands on the form fields instead of in a toast.
 */
export function createConsignmentRequest(
  payload: CreateConsignmentRequestPayload,
): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ENDPOINTS.list, payload, {
    silent: true,
  });
}

/**
 * `PATCH /corporate/consignmentrequests/{id}`.
 *
 * PATCH, not PUT — the route is registered as a PATCH and a PUT comes back 405.
 * The body is still the full record minus `selected_rate`: an edit does not
 * re-run check-rates, so the routing codes are carried over rather than
 * re-derived.
 */
export function updateConsignmentRequest(
  id: number,
  payload: UpdateConsignmentRequestPayload,
): Promise<MutationResult> {
  return privateApiClient.mutate("PATCH", ENDPOINTS.detail(id), payload, {
    silent: true,
  });
}

/**
 * `DELETE /corporate/consignmentrequests/{id}`.
 *
 * `silent` because the API explains a refusal better than our generic copy —
 * a request already picked up cannot be withdrawn, and saying why is useful.
 */
export function deleteConsignmentRequest(id: number): Promise<MutationResult> {
  return privateApiClient.mutate("DELETE", ENDPOINTS.detail(id), undefined, {
    silent: true,
  });
}
