import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type {
  ApprovalFilterValues,
  ApprovalPayload,
  ApprovalRequest,
  ApprovalType,
} from "../types";

/**
 * `/corporate/approval-requests` — the requests the signed-in corporate has
 * raised.
 *
 * One controller serves `/corporate` and `/external`; this app only ever uses
 * the corporate scope. Which corporate is implied by the `X-Corporate-Code`
 * header the private client attaches, so nothing here passes an owner id — the
 * caller's own account is the boundary, and the endpoint cannot see past it.
 */

const BASE = "/corporate/approval-requests";

export const ENDPOINTS = {
  list: BASE,
  detail: (id: number | string) => `${BASE}/${id}`,
  cancel: (id: number | string) => `${BASE}/${id}/cancel`,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

export interface ApprovalListParams extends Partial<ApprovalFilterValues> {
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

export interface ApprovalListResult {
  items: ApprovalRequest[];
  meta?: PageMeta;
}

/**
 * Picks the rows out of whichever envelope this endpoint uses.
 *
 * Documented as `data.approvalrequests`, but the API's list routes disagree
 * about where the array lives — `data.data` elsewhere, bare at the top level
 * for a few. Taking the first array we recognise means a shape we did not
 * predict renders an empty table rather than throwing.
 */
function readRequests(raw: unknown): ApprovalRequest[] {
  if (Array.isArray(raw)) return raw as ApprovalRequest[];
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.approvalrequests)) {
    return raw.approvalrequests as ApprovalRequest[];
  }

  const data = raw.data;
  if (Array.isArray(data)) return data as ApprovalRequest[];
  if (isRecord(data)) {
    if (Array.isArray(data.approvalrequests)) {
      return data.approvalrequests as ApprovalRequest[];
    }
    if (Array.isArray(data.data)) return data.data as ApprovalRequest[];
  }

  return [];
}

/** Blank filters are dropped, so an unused control sends nothing at all. */
function filterParams(params: ApprovalListParams): Record<string, string> {
  const keys: (keyof ApprovalFilterValues)[] = [
    "q",
    "status",
    "type",
    "corporate_id",
    "customer_id",
    "requested_from",
    "requested_to",
    "reviewed_from",
    "reviewed_to",
  ];

  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

/**
 * One page of requests.
 *
 * Every filter goes to the API rather than being applied to the rows in the
 * browser: the server counted the filtered set, so the pagination block stays
 * correct while filtering — which is the other half of why filtering belongs
 * on the API.
 *
 * `silent` because the table renders its own error card; a toast would double
 * up on every failed keystroke.
 */
export async function listApprovalRequests({
  page = 1,
  perPage = 15,
  signal,
  ...filters
}: ApprovalListParams = {}): Promise<ApprovalListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    ENDPOINTS.list,
    undefined,
    {
      params: { page, per_page: perPage, ...filterParams(filters) },
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
 * The detail route answers under the *plural* key — `data.approvalrequests`
 * holding one object — the same quirk `/corporate/users/{id}` and the
 * consignment routes have.
 */
function readRequest(raw: unknown): ApprovalRequest | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [
    data?.approvalrequests,
    data?.approvalrequest,
    raw.approvalrequests,
    raw.approvalrequest,
    data,
    raw,
  ];

  for (const candidate of candidates) {
    const record = Array.isArray(candidate) ? candidate[0] : candidate;
    if (isRecord(record) && looksLikeRequest(record)) {
      return record as unknown as ApprovalRequest;
    }
  }

  return null;
}

/**
 * Is this the record, or the envelope around it?
 *
 * An `id` is the usual tell but not enough on its own — PHP hands back
 * `"id": "42"` as a string often enough that requiring a number would turn a
 * good response into "not found". The request number is the other marker, and
 * it never appears on a wrapper.
 */
function looksLikeRequest(value: Record<string, unknown>): boolean {
  if (typeof value.request_no === "string") return true;
  if (typeof value.id === "number") return true;
  return typeof value.id === "string" && value.id.trim() !== "";
}

/**
 * One request.
 *
 * Throws when the id resolves to nothing, which the page turns into "not
 * found" — the same answer a deleted id, a mistyped one, and another
 * corporate's id all deserve. The endpoint is self-scoped, so the third case
 * is the common one.
 */
export async function fetchApprovalRequest(
  id: number | string,
  signal?: AbortSignal,
): Promise<ApprovalRequest> {
  const raw = await privateApiClient.get<unknown>(ENDPOINTS.detail(id), {
    // The page renders its own not-found; the client's toast would double up.
    silent: true,
    signal,
  });

  const request = readRequest(raw);
  if (!request) {
    throw new ApiError(404, "Approval request not found.", { payload: raw });
  }

  return request;
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

export interface CreateApprovalRequestPayload {
  type: ApprovalType;
  /** Sent only for `DISCOUNT`; resolved from the caller for every other type. */
  subject_id?: number;
  reason?: string;
  payload: ApprovalPayload;
}

/**
 * `POST /corporate/approval-requests`.
 *
 * `silent` so a 422 lands on the form fields instead of in a toast — the
 * dialog maps `fieldErrors` back onto its own inputs.
 */
export function createApprovalRequest(
  payload: CreateApprovalRequestPayload,
): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ENDPOINTS.list, payload, {
    silent: true,
  });
}

/**
 * `POST /corporate/approval-requests/{id}/cancel` — the caller withdrawing
 * their own pending request.
 *
 * A POST rather than a DELETE because the record survives: it moves to
 * CANCELLED and stays in the list, which is why the row is never removed
 * optimistically.
 *
 * `silent` because the API explains a refusal better than generic copy can —
 * a request reviewed a moment ago can no longer be withdrawn, and saying so
 * is more use than "something went wrong".
 */
export function cancelApprovalRequest(
  id: number | string,
): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ENDPOINTS.cancel(id), undefined, {
    silent: true,
  });
}
