import { ApiError } from "./errors";
import type { PageMeta, RawMeta } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Pull a payload out of the envelope by key — the `data` key varies per
 * endpoint (`data.users`, `data.consignmentrequests`, …).
 *
 * Also accepts the key at the top level, because a handful of endpoints skip
 * the envelope entirely (`GET /me` returns `{ user }`).
 */
export function unwrap<T>(body: unknown, key: string): T {
  if (isRecord(body)) {
    if (isRecord(body.data) && key in body.data) {
      return body.data[key] as T;
    }
    if (key in body) {
      return body[key] as T;
    }
  }

  throw new ApiError(500, "Unexpected response from the service.", {
    payload: body,
  });
}

/** Reads the pagination block, wherever this endpoint chose to put it. */
export function normalizeMeta(body: unknown): PageMeta | undefined {
  if (!isRecord(body)) return undefined;

  // Top level for most list endpoints; nested inside `data` for a few.
  const source = isRecord(body.meta)
    ? body.meta
    : isRecord(body.data) && isRecord(body.data.meta)
      ? body.data.meta
      : undefined;

  if (!source) return undefined;

  const meta = source as Partial<RawMeta>;
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
