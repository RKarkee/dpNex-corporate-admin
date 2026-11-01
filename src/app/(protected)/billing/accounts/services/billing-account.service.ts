import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import { ALL_KEYS } from "../lib/account-params";
import type { BillingAccount, BillingAccountFilterValues } from "../types";

/**
 * `/corporate/billingaccounts` — the caller's own billing accounts.
 *
 * Scope comes from the `X-Corporate-Code` header the private client attaches,
 * so nothing here passes a customer or corporate id.
 */

const BASE = "/corporate/billingaccounts";

export const ENDPOINTS = {
  list: BASE,
  detail: (id: number | string) => `${BASE}/${id}`,
  markPrimary: (id: number | string) => `${BASE}/${id}/primary`,
  /** Takes no id: it clears whichever account is currently the default. */
  removePrimary: `${BASE}/primary`,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

export interface BillingAccountListParams extends Partial<BillingAccountFilterValues> {
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

export interface BillingAccountListResult {
  items: BillingAccount[];
  meta?: PageMeta;
}

/**
 * Picks the rows out of the envelope — documented as
 * `data.billingaccounts`, with the neighbouring shapes accepted so a response
 * we did not predict renders an empty table rather than throwing.
 */
function readAccounts(raw: unknown): BillingAccount[] {
  if (Array.isArray(raw)) return raw as BillingAccount[];
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.billingaccounts)) {
    return raw.billingaccounts as BillingAccount[];
  }

  const data = raw.data;
  if (Array.isArray(data)) return data as BillingAccount[];
  if (isRecord(data)) {
    if (Array.isArray(data.billingaccounts)) {
      return data.billingaccounts as BillingAccount[];
    }
    if (Array.isArray(data.data)) return data.data as BillingAccount[];
  }

  return [];
}

/** Blank filters are dropped, so an unused control sends nothing at all. */
function filterParams(params: BillingAccountListParams): Record<string, string> {
  const out: Record<string, string> = {};

  for (const key of ALL_KEYS) {
    const value = params[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }

  return out;
}

/** `silent` because the view renders its own error card. */
export async function listBillingAccounts({
  page = 1,
  perPage = 15,
  signal,
  ...filters
}: BillingAccountListParams = {}): Promise<BillingAccountListResult> {
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

  return { items: readAccounts(response.raw), meta: response.meta };
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                     */
/* -------------------------------------------------------------------------- */

/** Documented as `data.billingaccount`; the plural key is accepted too. */
function readAccount(raw: unknown): BillingAccount | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [
    data?.billingaccount,
    data?.billingaccounts,
    raw.billingaccount,
    raw.billingaccounts,
    data,
    raw,
  ];

  for (const candidate of candidates) {
    const record = Array.isArray(candidate) ? candidate[0] : candidate;
    if (isRecord(record) && looksLikeAccount(record)) {
      return record as unknown as BillingAccount;
    }
  }

  return null;
}

/** The record, not the envelope around it. PHP sometimes sends `"id": "42"`. */
function looksLikeAccount(value: Record<string, unknown>): boolean {
  if (typeof value.billing_account_code === "string") return true;
  if (typeof value.id === "number") return true;
  return typeof value.id === "string" && value.id.trim() !== "";
}

export async function fetchBillingAccount(
  id: number | string,
  signal?: AbortSignal,
): Promise<BillingAccount> {
  const raw = await privateApiClient.get<unknown>(ENDPOINTS.detail(id), {
    // The page renders its own not-found; a toast would double up.
    silent: true,
    signal,
  });

  const account = readAccount(raw);
  if (!account) {
    throw new ApiError(404, "Billing account not found.", { payload: raw });
  }

  return account;
}

/* -------------------------------------------------------------------------- */
/* Default account                                                            */
/* -------------------------------------------------------------------------- */

/** `POST /corporate/billingaccounts/{id}/primary`. */
export function markBillingAccountPrimary(
  id: number | string,
): Promise<MutationResult> {
  return privateApiClient.mutate("POST", ENDPOINTS.markPrimary(id), undefined, {
    silent: true,
  });
}

/** `DELETE /corporate/billingaccounts/primary` — no account is default after. */
export function removePrimaryBillingAccount(): Promise<MutationResult> {
  return privateApiClient.mutate("DELETE", ENDPOINTS.removePrimary, undefined, {
    silent: true,
  });
}

/**
 * The server's reason for refusing a default change, if it gave one — the
 * first field message when there is one, else the envelope's own sentence.
 */
export function defaultRefusalReason(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const first = Object.values(error.fieldErrors ?? {})[0]?.[0];
  return first ?? error.message;
}
