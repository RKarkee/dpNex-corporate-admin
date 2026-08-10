import { NextResponse, type NextRequest } from "next/server";

import {
  CORPORATE_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/shared/auth/session";

/** Drops our cookies. The API has no logout endpoint, so the token stays valid upstream. */

function clear(response: NextResponse): NextResponse {
  for (const name of [SESSION_COOKIE, CORPORATE_COOKIE]) {
    response.cookies.set(name, "", { ...sessionCookieOptions, maxAge: 0 });
  }
  return response;
}

export function POST() {
  return clear(new NextResponse(null, { status: 204 }));
}

/** GET exists because a Server Component cannot clear a cookie; the layout redirects here. */
export function GET(request: NextRequest) {
  const expired = request.nextUrl.searchParams.get("expired") === "1";
  const destination = new URL(
    expired ? "/login?expired=1" : "/login",
    request.nextUrl.origin,
  );

  return clear(NextResponse.redirect(destination));
}
