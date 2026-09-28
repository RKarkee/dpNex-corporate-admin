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

/**
 * Required — there is no built-in default.
 *
 * A hardcoded fallback host is the kind of mistake that only shows up in
 * production: a missing or misspelled variable silently points a deployment at
 * whatever URL happened to be in the source, and every request succeeds against
 * the wrong API. Failing at startup is loud, immediate and cheap to fix.
 *
 * Next statically replaces `process.env.NEXT_PUBLIC_*` at BUILD time, so this
 * throws during the build when the variable is absent — which is exactly when
 * it should.
 */
function requiredUrl(name: string, value: string | undefined): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and give it your API base URL, including the version segment.`,
    );
  }

  return trimTrailingSlash(trimmed);
}

/** e.g. `https://api.dpnex.com/api/v1`. Used by both clients. */
export const API_BASE_URL = requiredUrl(
  "NEXT_PUBLIC_API_BASE_URL",
  process.env.NEXT_PUBLIC_API_BASE_URL,
);

/**
 * Server-side base, for Server Components and route handlers.
 *
 * Falls back to the public value — which is another environment variable, not a
 * literal. They point at the same API today, and only the server-only one can
 * be swapped for an internal hostname later.
 */
export function getServerApiBaseUrl(): string {
  const serverValue = process.env.API_BASE_URL?.trim();
  return serverValue ? trimTrailingSlash(serverValue) : API_BASE_URL;
}

/**
 * Upstream is slow under load; anything past this is treated as unreachable.
 *
 * A number, not a URL, so a default is legitimate — but a non-numeric value
 * would otherwise become `NaN` and disable the timeout entirely, which is worse
 * than ignoring it.
 */
const DEFAULT_TIMEOUT_MS = 20_000;

const configuredTimeout = Number(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT_MS);

export const REQUEST_TIMEOUT_MS =
  Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_TIMEOUT_MS;

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const IS_DEV = process.env.NODE_ENV === "development";
