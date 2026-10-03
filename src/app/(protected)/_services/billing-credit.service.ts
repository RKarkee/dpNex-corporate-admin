import { privateApiClient } from "@/shared/api/private-client";
import { readCredit, type CustomerCredit } from "@/shared/billing/credit";

/**
 * `GET /corporate/billing/credit` — the corporate's live credit position.
 *
 * Body: `{ data: { credit: {…} } }`. The client peels `data` when the envelope
 * carries both `data` and `status`, so both depths are tried. Scoped by the
 * `X-Corporate-Code` header like every other `/corporate/*` call.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function fetchBillingCredit(
  signal?: AbortSignal,
): Promise<CustomerCredit | null> {
  const raw = await privateApiClient.get<unknown>("/corporate/billing/credit", {
    // Lives in the header on every page; a failure toast there would follow
    // the user around. The widget hides itself instead.
    silent: true,
    signal,
  });

  if (!isRecord(raw)) return null;
  const data = isRecord(raw.data) ? raw.data : undefined;

  return readCredit(raw.credit ?? data?.credit);
}
