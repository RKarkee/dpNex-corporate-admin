import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";

import type {
  BoxWritePayload,
  ConsignmentBoxDetail,
  ConsignmentBoxItemDetail,
  ItemWritePayload,
} from "../types";
import { ADMIN_ENDPOINTS } from "./consignment-admin.service";

/**
 * Boxes and their items, as sub-resources of a consignment.
 *
 * The create and edit forms send the whole tree in one body — this file is for
 * the detail page, where a single box or item is added, corrected or removed
 * without re-submitting the consignment around it.
 *
 * Two API quirks, handled here rather than at the call sites:
 *
 * - **Creates are batched.** `POST …/boxes` takes `{ boxes: [...] }` and
 *   `POST …/items` takes `{ items: [...] }`, even for one. The dialogs pass a
 *   single record and this wraps it.
 * - **Updates are spoofed.** The route is a PATCH, but the API reads the body
 *   from a POST, so `_method: "PATCH"` rides along — Laravel's standard
 *   override. Note this is the sub-resource convention; the consignment itself
 *   takes a real `PUT`.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The array under `data.<key>`, wherever this endpoint chose to put it. */
function readCollection<T>(raw: unknown, key: string): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw[key])) return raw[key] as T[];

  const data = raw.data;
  if (Array.isArray(data)) return data as T[];
  if (isRecord(data)) {
    if (Array.isArray(data[key])) return data[key] as T[];
    if (Array.isArray(data.data)) return data.data as T[];
  }

  return [];
}

/**
 * The single record from a detail response.
 *
 * These routes answer under the plural key holding one object — `data.boxes` is
 * the box, not a list of them — so an array is unwrapped to its first entry
 * rather than rejected.
 */
function readRecord<T>(raw: unknown, key: string): T | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [data?.[key], raw[key], data];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return (candidate[0] as T | undefined) ?? null;
    }
    if (isRecord(candidate) && "id" in candidate) {
      return candidate as T;
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Boxes                                                                      */
/* -------------------------------------------------------------------------- */

export interface BoxListResult {
  boxes: ConsignmentBoxDetail[];
  meta?: PageMeta;
}

export async function listBoxes(
  consignmentId: number | string,
  page = 1,
  perPage = 10,
  signal?: AbortSignal,
): Promise<BoxListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    ADMIN_ENDPOINTS.boxes(consignmentId),
    undefined,
    {
      params: { page, per_page: perPage },
      // The table shows its own empty/error row.
      silent: true,
      signal,
    },
  );

  return {
    boxes: readCollection<ConsignmentBoxDetail>(response.raw, "boxes"),
    meta: response.meta,
  };
}

export async function fetchBox(
  consignmentId: number | string,
  boxId: number | string,
  signal?: AbortSignal,
): Promise<ConsignmentBoxDetail | null> {
  const raw = await privateApiClient.get<unknown>(
    ADMIN_ENDPOINTS.box(consignmentId, boxId),
    { silent: true, signal },
  );

  return readRecord<ConsignmentBoxDetail>(raw, "boxes");
}

/** `POST …/boxes` with `{ boxes: [...] }` — the endpoint takes a batch. */
export function createBoxes(
  consignmentId: number | string,
  boxes: BoxWritePayload[],
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "POST",
    ADMIN_ENDPOINTS.boxes(consignmentId),
    { boxes },
    { silent: true },
  );
}

export function updateBox(
  consignmentId: number | string,
  boxId: number | string,
  payload: BoxWritePayload,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "POST",
    ADMIN_ENDPOINTS.box(consignmentId, boxId),
    { ...payload, _method: "PATCH" },
    { silent: true },
  );
}

export function deleteBox(
  consignmentId: number | string,
  boxId: number | string,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "DELETE",
    ADMIN_ENDPOINTS.box(consignmentId, boxId),
    undefined,
    { silent: true },
  );
}

/* -------------------------------------------------------------------------- */
/* Items                                                                      */
/* -------------------------------------------------------------------------- */

export interface ItemListResult {
  items: ConsignmentBoxItemDetail[];
  meta?: PageMeta;
}

/**
 * Every item in a box.
 *
 * `perPage` defaults high because this list is nested inside an expanded table
 * row — a second set of page controls in there would be more chrome than the
 * handful of rows it governs.
 */
export async function listItems(
  consignmentId: number | string,
  boxId: number | string,
  page = 1,
  perPage = 50,
  signal?: AbortSignal,
): Promise<ItemListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    ADMIN_ENDPOINTS.items(consignmentId, boxId),
    undefined,
    { params: { page, per_page: perPage }, silent: true, signal },
  );

  return {
    items: readCollection<ConsignmentBoxItemDetail>(response.raw, "items"),
    meta: response.meta,
  };
}

export async function fetchItem(
  consignmentId: number | string,
  boxId: number | string,
  itemId: number | string,
  signal?: AbortSignal,
): Promise<ConsignmentBoxItemDetail | null> {
  const raw = await privateApiClient.get<unknown>(
    ADMIN_ENDPOINTS.item(consignmentId, boxId, itemId),
    { silent: true, signal },
  );

  return readRecord<ConsignmentBoxItemDetail>(raw, "items");
}

export function createItems(
  consignmentId: number | string,
  boxId: number | string,
  items: ItemWritePayload[],
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "POST",
    ADMIN_ENDPOINTS.items(consignmentId, boxId),
    { items },
    { silent: true },
  );
}

export function updateItem(
  consignmentId: number | string,
  boxId: number | string,
  itemId: number | string,
  payload: ItemWritePayload,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "POST",
    ADMIN_ENDPOINTS.item(consignmentId, boxId, itemId),
    { ...payload, _method: "PATCH" },
    { silent: true },
  );
}

export function deleteItem(
  consignmentId: number | string,
  boxId: number | string,
  itemId: number | string,
): Promise<MutationResult> {
  return privateApiClient.mutate(
    "DELETE",
    ADMIN_ENDPOINTS.item(consignmentId, boxId, itemId),
    undefined,
    { silent: true },
  );
}
