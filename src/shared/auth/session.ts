import { cache } from "react";
import { cookies } from "next/headers";

import type { User } from "./types";
import { bodySnippet, upstreamFetch } from "./upstream";

/** Server-side session: the bearer token plus the corporate code the API requires. */

export const SESSION_COOKIE = "dpnex_session";
export const CORPORATE_COOKIE = "dpnex_corp";

/** Policy, not fact — the API exposes no expiry and issues no refresh token. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
export const SESSION_MAX_AGE_REMEMBER_SECONDS = 60 * 60 * 24 * 30;

/** Set and clear paths must use identical attributes or the clear silently fails. */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

export interface SessionCredentials {
  token: string;
  corporateCode: string | undefined;
}

export async function getSessionCredentials(): Promise<
  SessionCredentials | undefined
> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return undefined;

  return { token, corporateCode: store.get(CORPORATE_COOKIE)?.value };
}

/** The real token check — the route gate only sees that a cookie exists. */
export const getServerUser = cache(async (): Promise<User | null> => {
  const credentials = await getSessionCredentials();
  if (!credentials) return null;

  try {
    const response = await upstreamFetch("me", credentials.token, {
      corporateCode: credentials.corporateCode,
    });

    if (!response.ok) {
      console.error(
        `[session] GET /me failed: ${response.status} ${await bodySnippet(response)}`,
      );
      return null;
    }

    // `/me` puts the user at the top level, unlike login's `data.user`.
    const body: unknown = await response.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("user" in body) ||
      typeof body.user !== "object" ||
      body.user === null
    ) {
      console.error("[session] GET /me returned an unexpected shape");
      return null;
    }

    return body.user as User;
  } catch (error) {
    console.error("[session] GET /me threw", error);
    return null;
  }
});

/** Rejects `//evil.com`, which would otherwise make `?next=` an open redirect. */
export function safeNext(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith("/")) return undefined;
  if (value.startsWith("//") || value.startsWith("/\\")) return undefined;
  return value;
}
