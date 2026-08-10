import { NextResponse, type NextRequest } from "next/server";

import {
  CORPORATE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_REMEMBER_SECONDS,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "@/shared/auth/session";
import type { LoginResult } from "@/shared/auth/types";
import {
  bodySnippet,
  getApiBaseUrl,
  resolveCorporateCode,
  upstreamFetch,
} from "@/shared/auth/upstream";

/** Credentials in, httpOnly session cookies out. The token never reaches the browser. */

const UPSTREAM_TIMEOUT_MS = 15_000;

const UNAVAILABLE = "The service is temporarily unavailable. Please try again.";

function failure(status: number, error: string): NextResponse<LoginResult> {
  return NextResponse.json<LoginResult>({ ok: false, error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure(400, "Enter your email and password.");
  }

  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const remember = form.get("remember") === "on";

  if (!email || !password) {
    return failure(400, "Enter your email and password.");
  }

  // Fresh FormData so `remember` stays local. Content-Type is left unset so
  // fetch adds the multipart boundary itself.
  const upstreamForm = new FormData();
  upstreamForm.set("email", email);
  upstreamForm.set("password", password);

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/login`, {
      method: "POST",
      body: upstreamForm,
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[auth/login] upstream unreachable:", error);
    return failure(
      504,
      "Could not reach the service. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    console.error(
      `[auth/login] POST /login rejected: ${response.status} ${await bodySnippet(response)}`,
    );

    if (response.status === 401 || response.status === 422) {
      return failure(401, "Incorrect email or password.");
    }
    if (response.status === 403) {
      return failure(403, "This account is not permitted to sign in.");
    }
    return failure(502, UNAVAILABLE);
  }

  const body: unknown = await response.json().catch(() => null);
  const data = isRecord(body) && isRecord(body.data) ? body.data : undefined;
  const token = typeof data?.token === "string" ? data.token : "";

  if (!token) {
    console.error(
      "[auth/login] POST /login returned no data.token; body keys:",
      isRecord(body) ? Object.keys(body) : typeof body,
    );
    return failure(502, UNAVAILABLE);
  }

  const corporateCode = resolveCorporateCode(data?.user);
  if (!corporateCode) {
    console.error(
      "[auth/login] no corporate code on data.user; user keys:",
      isRecord(data?.user) ? Object.keys(data.user) : typeof data?.user,
    );
    return failure(
      403,
      "This account is not linked to a corporate account. Contact your administrator.",
    );
  }

  // Prove the credentials resolve a user before setting a cookie, or a session
  // that logs in but fails /me bounces endlessly between /login and /dashboard.
  const meResponse = await upstreamFetch("me", token, { corporateCode }).catch(
    (error: unknown) => {
      console.error("[auth/login] GET /me threw:", error);
      return null;
    },
  );

  if (!meResponse) {
    return failure(504, UNAVAILABLE);
  }

  if (!meResponse.ok) {
    console.error(
      `[auth/login] GET /me rejected the new token: ${meResponse.status} ${await bodySnippet(meResponse)}`,
    );
    return failure(502, UNAVAILABLE);
  }

  const maxAge = remember
    ? SESSION_MAX_AGE_REMEMBER_SECONDS
    : SESSION_MAX_AGE_SECONDS;

  const result = NextResponse.json<LoginResult>({ ok: true });
  result.cookies.set(SESSION_COOKIE, token, { ...sessionCookieOptions, maxAge });
  result.cookies.set(CORPORATE_COOKIE, corporateCode, {
    ...sessionCookieOptions,
    maxAge,
  });

  return result;
}
