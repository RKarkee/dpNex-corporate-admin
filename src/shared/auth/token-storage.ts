"use client";

// From `session-config`, not `session` — the latter imports `next/headers`.
import { CORPORATE_COOKIE, SESSION_COOKIE } from "./session-config";

/**
 * Mirrors the token into a cookie the *server* can read.
 *
 * The token's home is `useAuthStore` — that is what the request interceptor
 * reads. But `proxy.ts` runs before any React code exists, and the
 * `(protected)` layout is a Server Component; neither can see localStorage. So
 * the same value is written to a cookie, purely so route gating keeps working
 * without a flash of the dashboard before a client-side guard kicks in.
 *
 * These cookies are readable by JavaScript by design — the token is already in
 * localStorage, so `httpOnly` here would protect nothing.
 */

const SAME_SITE = "Lax";

function write(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=${SAME_SITE}${secure}`;
}

function erase(name: string): void {
  if (typeof document === "undefined") return;

  // Attributes must match the write or the browser treats it as a different
  // cookie and the delete silently does nothing.
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=${SAME_SITE}${secure}`;
}

export function persistAuthCookies(
  token: string,
  corporateCode: string | null,
  maxAgeSeconds: number,
): void {
  write(SESSION_COOKIE, token, maxAgeSeconds);
  if (corporateCode) write(CORPORATE_COOKIE, corporateCode, maxAgeSeconds);
}

export function clearAuthCookies(): void {
  erase(SESSION_COOKIE);
  erase(CORPORATE_COOKIE);
}
