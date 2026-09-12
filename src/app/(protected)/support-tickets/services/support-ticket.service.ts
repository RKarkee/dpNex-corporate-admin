import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type { SupportTicket, TicketFilterValues } from "../types";

/**
 * `/corporate/supporttickets` — the tickets raised inside the signed-in
 * corporate.
 *
 * Scope is applied by the API before any filter, from the `X-Corporate-Code`
 * header the private client attaches: naming another corporate narrows the
 * caller's own set rather than reaching outside it. Nothing here passes an
 * owner id for that reason.
 */

const BASE = "/corporate/supporttickets";

export const ENDPOINTS = {
  list: BASE,
  detail: (id: number | string) => `${BASE}/${id}`,
  close: (id: number | string) => `${BASE}/${id}/close`,
  replies: (id: number | string) => `${BASE}/${id}/replies`,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

export interface TicketListParams extends Partial<TicketFilterValues> {
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

export interface TicketListResult {
  items: SupportTicket[];
  meta?: PageMeta;
}

/**
 * Picks the rows out of whichever envelope this endpoint uses.
 *
 * Documented as `data.supporttickets`, with the neighbouring shapes accepted
 * too — a response we did not predict renders an empty table rather than
 * throwing.
 */
function readTickets(raw: unknown): SupportTicket[] {
  if (Array.isArray(raw)) return raw as SupportTicket[];
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.supporttickets)) {
    return raw.supporttickets as SupportTicket[];
  }

  const data = raw.data;
  if (Array.isArray(data)) return data as SupportTicket[];
  if (isRecord(data)) {
    if (Array.isArray(data.supporttickets)) {
      return data.supporttickets as SupportTicket[];
    }
    if (Array.isArray(data.data)) return data.data as SupportTicket[];
  }

  return [];
}

const FILTER_KEYS: (keyof TicketFilterValues)[] = [
  "q",
  "ticket_no",
  "subject",
  "status",
  "priority",
  "category",
  "assigned_to",
  "unassigned",
  "raised_by",
  "corporate_id",
  "customer_id",
  "consignment_id",
  "open",
  "resolved",
  "has_consignment",
  "awaiting_first_response",
  "created_from",
  "created_to",
  "resolved_from",
  "resolved_to",
];

/** Blank filters are dropped, so an unused control sends nothing at all. */
function filterParams(params: TicketListParams): Record<string, string> {
  const out: Record<string, string> = {};

  for (const key of FILTER_KEYS) {
    const value = params[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }

  return out;
}

/**
 * One page of tickets.
 *
 * Every filter goes to the API, so the pagination block counts the filtered
 * set — which is the other half of why filtering belongs on the server rather
 * than in the browser.
 *
 * `silent` because the table renders its own error card; a toast would double
 * up.
 */
export async function listSupportTickets({
  page = 1,
  perPage = 15,
  signal,
  ...filters
}: TicketListParams = {}): Promise<TicketListResult> {
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

  return { items: readTickets(response.raw), meta: response.meta };
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Finds the single record inside the envelope.
 *
 * The detail route answers under the *plural* key — `data.supporttickets`
 * holding one object — the same quirk the consignment and approval routes have.
 */
function readTicket(raw: unknown): SupportTicket | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [
    data?.supporttickets,
    data?.supportticket,
    raw.supporttickets,
    raw.supportticket,
    data,
    raw,
  ];

  for (const candidate of candidates) {
    const record = Array.isArray(candidate) ? candidate[0] : candidate;
    if (isRecord(record) && looksLikeTicket(record)) {
      return record as unknown as SupportTicket;
    }
  }

  return null;
}

/**
 * Is this the record, or the envelope around it?
 *
 * The ticket number is the strongest marker and never appears on a wrapper. An
 * `id` is the fallback, accepted as a string too — PHP hands back `"id": "42"`
 * often enough that requiring a number would turn a good response into "not
 * found".
 */
function looksLikeTicket(value: Record<string, unknown>): boolean {
  if (typeof value.ticket_no === "string") return true;
  if (typeof value.id === "number") return true;
  return typeof value.id === "string" && value.id.trim() !== "";
}

export async function fetchSupportTicket(
  id: number | string,
  signal?: AbortSignal,
): Promise<SupportTicket> {
  const raw = await privateApiClient.get<unknown>(ENDPOINTS.detail(id), {
    // The page renders its own not-found; the client's toast would double up.
    silent: true,
    signal,
  });

  const ticket = readTicket(raw);
  if (!ticket) {
    throw new ApiError(404, "Support ticket not found.", { payload: raw });
  }

  return ticket;
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

export interface ReplyPayload {
  message: string;
  /** Requests a staff-only note. Honoured by the server for internal callers. */
  isInternal?: boolean;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  category?: string;
  priority?: string;
  consignment_id?: number;
  customer_id?: number;
  /** Never sent from this app — the corporate comes from the session. */
  corporate_id?: never;
}

/**
 * `POST /corporate/supporttickets`.
 *
 * `silent` so a 422 lands on the form fields instead of in a toast — the dialog
 * maps `fieldErrors` back onto its own inputs.
 */
export function createSupportTicket(
  payload: CreateTicketPayload,
): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ENDPOINTS.list, payload, {
    silent: true,
  });
}

/**
 * `POST /corporate/supporttickets/{id}/replies`.
 *
 * `is_internal` is sent only when true. Omitting it is what the API's own
 * public-reply sample does, and an explicit `false` adds nothing except another
 * place for the flag to be flipped by accident.
 *
 * The server is what enforces the flag — it is honoured only for internal
 * callers, so a customer cannot post a staff-only note and staff cannot leak
 * one by mistake. The composer offers both modes and the refetched thread shows
 * which one the message actually landed as.
 *
 * Confirmed side effect: the server sets `first_responded_at` on the ticket.
 * Nothing here computes that — the caller invalidates and refetches, so the
 * behaviour stays right whatever the server decides counts as a first response.
 * The response shape is undocumented, so nothing is read out of it either.
 */
export function replyToSupportTicket(
  id: number | string,
  { message, isInternal }: ReplyPayload,
): Promise<MutationResult> {
  const body: { message: string; is_internal?: true } = {
    message: message.trim(),
  };
  if (isInternal) body.is_internal = true;

  return privateApiClient.mutate("POST", ENDPOINTS.replies(id), body, {
    silent: true,
  });
}

/**
 * `POST /corporate/supporttickets/{id}/close`.
 *
 * Refuses anything that is not RESOLVED, as a 422 with the reason under
 * `errors.status` — "Only a resolved ticket can be closed." The UI gates on the
 * same rule, but the server is the authority: a ticket reopened by someone else
 * a second ago will still be refused here, and its sentence is better than
 * anything generic.
 */
export function closeSupportTicket(
  id: number | string,
): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ENDPOINTS.close(id), undefined, {
    silent: true,
  });
}

/** The server's reason for refusing a close, if it gave one. */
export function closeRefusalReason(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return error.fieldErrors?.status?.[0] ?? error.message;
}
