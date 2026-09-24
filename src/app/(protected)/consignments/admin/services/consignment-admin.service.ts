import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type {
  CheckRatesPayload,
  CheckRatesResult,
  ConsignmentBoxDetail,
  ConsignmentDetail,
  ConsignmentDetailResult,
  ConsignmentListItem,
  CreateConsignmentPayload,
  UpdateConsignmentPayload,
} from "../types";

/**
 * `/corporate/consignments` — accepted consignments for the signed-in
 * corporate.
 *
 * A different resource from `/corporate/consignmentrequests`, which is why this
 * module is standalone rather than parameterised over a base path. The Super
 * Admin portal reaches the same objects under `/admin/consignments`; that
 * namespace is never called from here.
 *
 * Which corporate is implied by the `X-Corporate-Code` header the private
 * client attaches, so no request passes an id — the endpoint cannot see outside
 * the caller's own corporate.
 */

const BASE = "/corporate/consignments";

export const ADMIN_ENDPOINTS = {
  /** Shared with the request module upstream, but called independently here. */
  checkRates: "/corporate/check-rates",
  list: BASE,
  detail: (id: number | string) => `${BASE}/${id}`,
  boxes: (id: number | string) => `${BASE}/${id}/boxes`,
  box: (id: number | string, boxId: number | string) => `${BASE}/${id}/boxes/${boxId}`,
  items: (id: number | string, boxId: number | string) =>
    `${BASE}/${id}/boxes/${boxId}/items`,
  item: (id: number | string, boxId: number | string, itemId: number | string) =>
    `${BASE}/${id}/boxes/${boxId}/items/${itemId}`,

  deleted: `${BASE}/deleted`,
  restore: (id: number | string) => `${BASE}/${id}/restore`,

  // Workflow actions — see consignment-actions.service.ts.
  updateStatus: (id: number | string) => `${BASE}/${id}/updatestatus`,
  updateSender: (id: number | string) => `${BASE}/${id}/updateSender`,
  updateReceiver: (id: number | string) => `${BASE}/${id}/updateReceiver`,
  events: (id: number | string) => `${BASE}/${id}/events`,
  assign: (id: number | string) => `${BASE}/${id}/assign`,
  reassign: (id: number | string) => `${BASE}/${id}/reassign`,
  cancel: (id: number | string) => `${BASE}/${id}/cancel`,
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
 * Step one of creating a consignment: the user picks one of these, and the
 * chosen object travels to the create endpoint untouched as `selected_rate`.
 *
 * `silent` because the form shows the failure in place, next to the inputs that
 * caused it.
 */
export async function checkRates(
  payload: CheckRatesPayload,
  signal?: AbortSignal,
): Promise<CheckRatesResult> {
  const data = await privateApiClient.post<unknown>(
    ADMIN_ENDPOINTS.checkRates,
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

export interface ConsignmentListParams {
  page?: number;
  perPage?: number;
  /** Sent to the API, so it matches across every page — not just this one. */
  search?: string;
  signal?: AbortSignal;
}

export interface ConsignmentListResult {
  items: ConsignmentListItem[];
  meta?: PageMeta;
}

/**
 * Picks the rows out of whichever envelope this endpoint uses.
 *
 * `data.consignments` is the documented shape, but the reference portal also
 * handles `consignmentrequests` coming back from this route — the two resources
 * share a controller upstream. Taking the first array we recognise means a
 * shape we did not predict renders an empty table instead of throwing.
 */
function readConsignments(raw: unknown): ConsignmentListItem[] {
  if (Array.isArray(raw)) return raw as ConsignmentListItem[];
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.consignments)) {
    return raw.consignments as ConsignmentListItem[];
  }
  if (Array.isArray(raw.consignmentrequests)) {
    return raw.consignmentrequests as ConsignmentListItem[];
  }

  const data = raw.data;
  if (Array.isArray(data)) return data as ConsignmentListItem[];
  if (isRecord(data)) {
    if (Array.isArray(data.consignments)) {
      return data.consignments as ConsignmentListItem[];
    }
    if (Array.isArray(data.consignmentrequests)) {
      return data.consignmentrequests as ConsignmentListItem[];
    }
    if (Array.isArray(data.data)) return data.data as ConsignmentListItem[];
  }

  return [];
}

/**
 * One page of consignments, optionally filtered.
 *
 * `search` goes to the API rather than being applied to the rows in the
 * browser. Filtering the current page locally looks the same on page one and is
 * wrong everywhere else — it can only match the rows already loaded, so a
 * tracking id on page four appears not to exist.
 */
export async function listConsignments({
  page = 1,
  perPage = 15,
  search,
  signal,
}: ConsignmentListParams = {}): Promise<ConsignmentListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    ADMIN_ENDPOINTS.list,
    undefined,
    {
      params: { page, per_page: perPage, search: search?.trim() || undefined },
      // The table renders its own error card; the client's toast would double up.
      silent: true,
      signal,
    },
  );

  return { items: readConsignments(response.raw), meta: response.meta };
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Is this the record, or the envelope around it?
 *
 * An `id` is the usual tell, but not enough on its own: PHP hands back
 * `"id": "42"` as a string often enough that requiring a number would turn a
 * good response into "not found" — which, from the edit page, looks like the
 * feature is broken rather than the record missing. The tracking id and the
 * party objects are the other markers; none appear on a wrapper.
 */
function looksLikeConsignment(value: Record<string, unknown>): boolean {
  if (typeof value.id === "number") return true;
  if (typeof value.id === "string" && value.id.trim() !== "") return true;
  if (typeof value.request_tracking_id === "string") return true;
  if (typeof value.tracking_number === "string") return true;
  return isRecord(value.sender) || isRecord(value.receiver);
}

/** Finds the single record inside whichever envelope this route used. */
function readConsignment(raw: unknown): ConsignmentDetail | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [
    data?.consignments,
    data?.consignment,
    data?.consignmentrequests,
    data?.consignmentrequest,
    raw.consignments,
    raw.consignment,
    data,
    raw,
  ];

  for (const candidate of candidates) {
    // Some routes answer under the plural key with the record wrapped in an
    // array; take the first entry rather than rejecting the whole response.
    const record = Array.isArray(candidate) ? candidate[0] : candidate;
    if (isRecord(record) && looksLikeConsignment(record)) {
      return record as unknown as ConsignmentDetail;
    }
  }

  return null;
}

/**
 * One consignment, for the detail and edit pages.
 *
 * Boxes may arrive nested on the record or as a sibling of it; both are read,
 * because the edit form cannot seed its box array without them.
 *
 * Throws when the id resolves to nothing, which the page turns into "not
 * found" — the same answer a deleted id, a mistyped one, and another
 * corporate's id all deserve.
 */
export async function fetchConsignment(
  id: number,
  signal?: AbortSignal,
): Promise<ConsignmentDetailResult> {
  const raw = await privateApiClient.get<unknown>(ADMIN_ENDPOINTS.detail(id), {
    // The page renders its own not-found; the client's toast would double up.
    silent: true,
    signal,
  });

  const consignment = readConsignment(raw);
  if (!consignment) {
    throw new ApiError(404, "Consignment not found.", { payload: raw });
  }

  const nested = Array.isArray(consignment.boxes) ? consignment.boxes : undefined;
  const sibling =
    isRecord(raw) && isRecord(raw.data) && Array.isArray(raw.data.boxes)
      ? (raw.data.boxes as ConsignmentBoxDetail[])
      : undefined;

  return { consignment, boxes: nested ?? sibling ?? [] };
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * `POST /corporate/consignments`.
 *
 * JSON, not multipart — there is no file here, and the body nests three levels
 * deep (consignment → boxes → items), which `FormData` would flatten into
 * bracket-notation keys for no gain.
 *
 * `silent` so a 422 lands on the form fields instead of in a toast.
 */
export function createConsignment(
  payload: CreateConsignmentPayload,
): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ADMIN_ENDPOINTS.list, payload, {
    silent: true,
  });
}

/**
 * `PUT /corporate/consignments/{id}`.
 *
 * **PUT, not PATCH** — the opposite of `/corporate/consignmentrequests`, which
 * registers a PATCH. Same business object, different route, and getting it
 * wrong is a 405. The body is the full record minus `selected_rate`.
 */
export function updateConsignment(
  id: number,
  payload: UpdateConsignmentPayload,
): Promise<MutationResult> {
  return privateApiClient.mutate("PUT", ADMIN_ENDPOINTS.detail(id), payload, {
    silent: true,
  });
}

/**
 * `DELETE /corporate/consignments/{id}`.
 *
 * `silent` because the API explains a refusal better than our generic copy — a
 * consignment already in transit cannot be removed, and saying why is useful.
 */
export function deleteConsignment(id: number): Promise<MutationResult> {
  return privateApiClient.mutate(
    "DELETE",
    ADMIN_ENDPOINTS.detail(id),
    undefined,
    { silent: true },
  );
}

/* -------------------------------------------------------------------------- */
/* Deleted consignments                                                       */
/* -------------------------------------------------------------------------- */

/**
 * `GET /corporate/consignments/deleted` — the soft-deleted consignments, one
 * page at a time. Same envelope as the main list, so the same reader applies.
 */
export async function listDeletedConsignments({
  page = 1,
  perPage = 15,
  signal,
}: Omit<ConsignmentListParams, "search"> = {}): Promise<ConsignmentListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    ADMIN_ENDPOINTS.deleted,
    undefined,
    {
      params: { page, per_page: perPage },
      // The tab renders its own error card; the client's toast would double up.
      silent: true,
      signal,
    },
  );

  return { items: readConsignments(response.raw), meta: response.meta };
}

/** `POST /corporate/consignments/{id}/restore` — undoes a delete. */
export function restoreConsignment(id: number): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ADMIN_ENDPOINTS.restore(id), undefined, {
    silent: true,
  });
}
