import { privateApiClient } from "@/shared/api/private-client";

import { normalizeTrackResponse } from "../lib/normalize-track";
import type { CheckRatesInput, RateOption, TrackInput, TrackResult } from "../types";

/**
 * `POST /corporate/check-rates` and `POST /corporate/track`.
 *
 * Both are POSTs that only read, run as mutations by the hooks: they fire on
 * submit, never on mount, and must be re-runnable with the same inputs.
 * `silent` on both because each form shows its failure in place.
 */

export const ENDPOINTS = {
  checkRates: "/corporate/check-rates",
  track: "/corporate/track",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The quotes for a destination and weight.
 *
 * Rows are kept exactly as the API sent them — one may become `selected_rate`
 * on a consignment request, and the backend re-prices against the object it
 * issued. Only rows that cannot be a quote at all (no id, no total) are
 * dropped. An empty list is a real answer: nothing serves that lane.
 */
export async function checkRates(
  input: CheckRatesInput,
  signal?: AbortSignal,
): Promise<RateOption[]> {
  const data = await privateApiClient.post<unknown>(ENDPOINTS.checkRates, input, {
    silent: true,
    signal,
  });

  const rows = isRecord(data) && Array.isArray(data.rates) ? data.rates : [];

  return rows.filter(
    (row): row is RateOption =>
      isRecord(row) &&
      typeof row.customer_rate_id === "number" &&
      row.total_amount !== undefined &&
      row.total_amount !== null,
  );
}

/** Where a shipment is, and what the API is willing to say about it. */
export async function trackShipment(
  input: TrackInput,
  signal?: AbortSignal,
): Promise<TrackResult> {
  const data = await privateApiClient.post<unknown>(
    ENDPOINTS.track,
    {
      tracking_no: input.tracking_no.trim(),
      ...(input.type ? { type: input.type } : {}),
      ...(input.entry ? { entry: input.entry } : {}),
    },
    { silent: true, signal },
  );

  return normalizeTrackResponse(data);
}
