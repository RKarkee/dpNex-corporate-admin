/**
 * Every environment value the app reads, in one place.
 *
 * `NEXT_PUBLIC_API_BASE_URL` is the single base URL for both clients. Nothing
 * in the app hardcodes a host — service functions pass paths only
 * (`"/login"`, `"/corporate/users"`) and the client prefixes this.
 *
 * Next.js statically replaces `process.env.NEXT_PUBLIC_*` at build time, so it
 * must be referenced by its full literal name — destructuring `process.env`
 * or building the key dynamically silently yields `undefined`.
 */

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** e.g. `https://api.dpnex.com/api/v1`. Used by both clients. */
export const API_BASE_URL = trimTrailingSlash(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.dpnex.com/api/v1",
);

/**
 * Server-side base, for Server Components and route handlers.
 *
 * Falls back to the public value: they point at the same API, and only the
 * server-only variable can be swapped for an internal hostname later.
 */
export function getServerApiBaseUrl(): string {
  return trimTrailingSlash(process.env.API_BASE_URL ?? API_BASE_URL);
}

/** Upstream is slow under load; anything past this is treated as unreachable. */
export const REQUEST_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_REQUEST_TIMEOUT_MS ?? 20_000,
);

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const IS_DEV = process.env.NODE_ENV === "development";
