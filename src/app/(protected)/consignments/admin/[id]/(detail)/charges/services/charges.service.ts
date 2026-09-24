import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type { ChargeFilters, ChargeInput, ConsignmentCharge } from "../types";

/**
 * `/corporate/consignments/{id}/charges` — the cost line items.
 *
 * **The envelope trap**, same as locations: the list and the detail both
 * answer under `data.charges`, an array on the list and a single object on the
 * detail. The two readers are separate and each asserts the shape it needs.
 *
 * Updates are a real `PATCH` — no files, so plain JSON and the honest verb.
 */

function basePath(consignmentId: number | string): string {
  return `/corporate/consignments/${consignmentId}/charges`;
}

function rowPath(consignmentId: number | string, chargeId: number | string) {
  return `${basePath(consignmentId)}/${chargeId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Numbers arrive as strings, but a stray number must not blank a cell. */
function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function optionalText(value: unknown): string | null {
  const result = text(value);
  return result.trim() ? result : null;
}

function normalizeCharge(row: Record<string, unknown>): ConsignmentCharge | null {
  // A row without an id cannot be viewed, edited or deleted.
  if (typeof row.id !== "number") return null;

  return {
    id: row.id,
    name: text(row.name),
    description: optionalText(row.description),
    quantity: text(row.quantity),
    quantity_code: text(row.quantity_code),
    rate: text(row.rate),
    amount: text(row.amount),
    currency: optionalText(row.currency),
    base_currency: optionalText(row.base_currency),
    exchange_rate: optionalText(row.exchange_rate),
    is_system_generated: String(row.is_system_generated ?? "").trim() === "Y" ? "Y" : "N",
  };
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

export interface ChargePage {
  items: ConsignmentCharge[];
  meta: PageMeta | undefined;
}

export async function listCharges({
  consignmentId,
  page,
  filters,
  signal,
}: {
  consignmentId: number | string;
  page: number;
  filters: ChargeFilters;
  signal?: AbortSignal;
}): Promise<ChargePage> {
  const { items, meta } = await privateApiClient.paginated<unknown>(basePath(consignmentId), {
    params: {
      page,
      per_page: filters.perPage,
      // Blank values are dropped by the client, so an unset filter is not sent.
      name: filters.name.trim() || undefined,
      quantity_code: filters.quantity_code || undefined,
      is_system_generated: filters.is_system_generated || undefined,
    },
    unwrap: "charges",
    silent: true,
    signal,
  });

  return {
    items: items.filter(isRecord).flatMap((row) => {
      const parsed = normalizeCharge(row);
      return parsed ? [parsed] : [];
    }),
    meta,
  };
}

/** One charge, read fresh when a dialog opens — the single record sits under the plural key. */
export async function fetchCharge(
  consignmentId: number | string,
  chargeId: number,
  signal?: AbortSignal,
): Promise<ConsignmentCharge> {
  const raw = await privateApiClient.get<unknown>(rowPath(consignmentId, chargeId), {
    silent: true,
    signal,
  });

  if (!isRecord(raw)) {
    throw new ApiError(502, "Unexpected response from the service.", { payload: raw });
  }

  const data = isRecord(raw.data) ? raw.data : undefined;
  for (const candidate of [data?.charges, data?.charge, raw.charges, raw.charge, data]) {
    const record = Array.isArray(candidate) ? candidate[0] : candidate;
    if (!isRecord(record)) continue;
    const parsed = normalizeCharge(record);
    if (parsed) return parsed;
  }

  throw new ApiError(502, "Unexpected response from the service.", { payload: raw });
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

/** Blank description is omitted rather than sent as `""` over a stored value. */
function toChargePayload(input: ChargeInput): ChargeInput {
  const description = input.description?.trim();
  return {
    name: input.name.trim(),
    ...(description ? { description } : {}),
    quantity: input.quantity.trim(),
    quantity_code: input.quantity_code,
    rate: input.rate.trim(),
    amount: input.amount.trim(),
  };
}

export function createCharge(
  consignmentId: number | string,
  input: ChargeInput,
): Promise<MutationResult> {
  return privateApiClient.mutate("POST", basePath(consignmentId), toChargePayload(input), {
    silent: true,
  });
}

export function updateCharge(
  consignmentId: number | string,
  chargeId: number,
  input: ChargeInput,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "PATCH",
    rowPath(consignmentId, chargeId),
    toChargePayload(input),
    { silent: true },
  );
}

export function deleteCharge(
  consignmentId: number | string,
  chargeId: number,
): Promise<MutationResult> {
  return privateApiClient.mutate("DELETE", rowPath(consignmentId, chargeId), undefined, {
    silent: true,
  });
}
