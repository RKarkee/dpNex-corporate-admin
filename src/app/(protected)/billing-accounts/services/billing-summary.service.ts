import { privateApiClient } from "@/shared/api/private-client";

/**
 * `/corporate/billing/summary` — headline billing figures for the corporate.
 *
 * No confirmed schema exists for this endpoint yet, so unlike
 * `billing-invoices.service.ts` this does not normalise into a typed shape —
 * it hands back whatever record the envelope carries, and
 * `_lib/summarize-billing.ts` reads it defensively from there. Scoped by the
 * `X-Corporate-Code` header the private client attaches, the same way every
 * other `/corporate/*` call in this app is.
 */
export type BillingSummary = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Picks the summary object out of whichever envelope this endpoint uses.
 *
 * Tried in order of how specific the key is: a nested `summary` (or
 * `billing_summary`) object first, then `data` itself in case this endpoint
 * skips that extra nesting — the same way `/me` skips the envelope's usual
 * `data` wrapper entirely — and only then the raw body, as a last resort that
 * is unlikely to render anything useful.
 */
function readSummary(raw: unknown): BillingSummary {
  if (!isRecord(raw)) return {};

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [data?.summary, data?.billing_summary, data, raw.summary, raw];

  for (const candidate of candidates) {
    if (isRecord(candidate)) return candidate;
  }

  return {};
}

export async function fetchBillingSummary(signal?: AbortSignal): Promise<BillingSummary> {
  const raw = await privateApiClient.get<unknown>("/corporate/billing/summary", {
    // The page renders its own error card; the client's toast would double up.
    silent: true,
    signal,
  });

  return readSummary(raw);
}
