import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, safeNext } from "@/shared/auth/session";

/**
 * Route gate (Next 16's `proxy` convention). Checks only that a cookie exists —
 * a stale one passes, and is caught by the `/me` call in the protected layout.
 */

export const config = {
  // `/api` is excluded so /api/gateway answers 401 JSON rather than redirecting to HTML.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};

export default function proxy(request: NextRequest) {
  const { pathname, search, searchParams, origin } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    if (!hasSession) return NextResponse.next();

    const destination = safeNext(searchParams.get("next")) ?? "/dashboard";
    return NextResponse.redirect(new URL(destination, origin));
  }

  if (hasSession) return NextResponse.next();

  const login = new URL("/login", origin);
  if (pathname !== "/") {
    login.searchParams.set("next", pathname + search);
  }

  return NextResponse.redirect(login);
}
