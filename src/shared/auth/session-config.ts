/**
 * Session constants shared by client and server.
 *
 * This file must stay free of `next/headers`, `cookies()` and anything else
 * server-only. `session.ts` imports it and adds the server behaviour;
 * `auth-store.ts` and `token-storage.ts` import it from the client. Putting
 * these values in `session.ts` drags `next/headers` into the client bundle
 * and the build fails.
 */

/** The bearer token, mirrored from the store so the server can gate routes. */
export const SESSION_COOKIE = "dpnex_session";

/** The active `corp_code`, sent upstream as `X-Corporate-Code`. */
export const CORPORATE_COOKIE = "dpnex_corp";

/** Policy, not fact — the API exposes no expiry and issues no refresh token. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
export const SESSION_MAX_AGE_REMEMBER_SECONDS = 60 * 60 * 24 * 30;

/** Set and clear paths must use identical attributes or the clear silently fails. */
export const sessionCookieOptions = {
  // Deliberate: the client owns the token (it lives in `useAuthStore` and
  // localStorage) and writes this cookie itself via `token-storage.ts`. The
  // cookie exists only so `proxy.ts` and Server Components can gate routes
  // without a flash. httpOnly would break the write and protect nothing.
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

/** Rejects `//evil.com`, which would otherwise make `?next=` an open redirect. */
export function safeNext(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith("/")) return undefined;
  if (value.startsWith("//") || value.startsWith("/\\")) return undefined;
  return value;
}
