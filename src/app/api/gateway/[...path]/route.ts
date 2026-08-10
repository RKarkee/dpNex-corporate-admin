import { NextResponse, type NextRequest } from "next/server";

import {
  CORPORATE_COOKIE,
  getSessionCredentials,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/shared/auth/session";
import {
  getApiBaseUrl,
  isAllowedPath,
  upstreamFetchUrl,
} from "@/shared/auth/upstream";

/** Authenticated passthrough to the DpNEx API — the only route holding the token. */

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

function isSafeSegment(segment: string): boolean {
  return (
    segment.length > 0 &&
    segment !== "." &&
    segment !== ".." &&
    !segment.includes("/") &&
    !segment.includes("\\")
  );
}

function copyRequestHeaders(request: NextRequest, hasBody: boolean): Headers {
  // Fresh, not copied: forwarding the incoming headers would leak our cookie upstream.
  const headers = new Headers();

  if (hasBody) {
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
  }

  return headers;
}

function copyResponseHeaders(upstream: Response): Headers {
  // Notably absent: `set-cookie`.
  const headers = new Headers();

  for (const name of ["content-type", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

async function handle(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const credentials = await getSessionCredentials();
  if (!credentials) {
    return jsonError(401, "Not authenticated.");
  }

  const method = request.method.toUpperCase();

  if (method !== "GET" && method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return jsonError(403, "Cross-origin request refused.");
    }
  }

  const { path: segments } = await context.params;
  if (!segments.every(isSafeSegment)) {
    return jsonError(404, "Not found.");
  }
  const path = segments.join("/");

  // 404 rather than 403, so the allowlist cannot be enumerated.
  if (!isAllowedPath(path)) {
    return jsonError(404, "Not found.");
  }

  const base = new URL(getApiBaseUrl());
  const url = new URL(`${getApiBaseUrl()}/${path}`);

  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
    return jsonError(404, "Not found.");
  }

  for (const [key, value] of request.nextUrl.searchParams) {
    url.searchParams.append(key, value);
  }

  const hasBody = method !== "GET" && method !== "HEAD" && method !== "DELETE";

  let upstream: Response;
  try {
    upstream = await upstreamFetchUrl(url, credentials.token, {
      method,
      corporateCode: credentials.corporateCode,
      headers: copyRequestHeaders(request, hasBody),
      body: hasBody ? await request.arrayBuffer() : undefined,
    });
  } catch (error) {
    console.error("[api/gateway] upstream unreachable", path, error);
    return jsonError(504, "Could not reach the service.");
  }

  if (upstream.status === 401) {
    const expired = jsonError(401, "Your session has ended. Please sign in again.");
    for (const name of [SESSION_COOKIE, CORPORATE_COOKIE]) {
      expired.cookies.set(name, "", { ...sessionCookieOptions, maxAge: 0 });
    }
    return expired;
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: copyResponseHeaders(upstream),
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
