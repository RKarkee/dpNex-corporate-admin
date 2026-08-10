import { ApiError } from "./errors";
import type { PageMeta, RawMeta } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Pull a payload out of the envelope by key — the `data` key varies per endpoint. */
export function unwrap<T>(body: unknown, key: string): T {
  if (!isRecord(body) || !isRecord(body.data) || !(key in body.data)) {
    throw new ApiError(500, "Unexpected response from the service.", body);
  }
  return body.data[key] as T;
}

/** Reads the top-level `meta` block, if the endpoint paginates. */
export function normalizeMeta(body: unknown): PageMeta | undefined {
  if (!isRecord(body) || !isRecord(body.meta)) return undefined;

  const meta = body.meta as Partial<RawMeta>;
  if (typeof meta.current_page !== "number") return undefined;

  return {
    page: meta.current_page,
    pageCount: meta.last_page ?? 1,
    perPage: meta.per_page ?? 0,
    total: meta.total ?? 0,
    from: meta.from ?? null,
    to: meta.to ?? null,
  };
}
